import Database from "better-sqlite3";
import { ChromaClient } from "chromadb";

const db = new Database("/app/data/repomind.db");

// Find all repos with failed embed status
const failedRepos = db.prepare("SELECT id, name, owner FROM repositories WHERE embed_status = 'failed'").all();
console.log(`Found ${failedRepos.length} repos with failed embeddings:\n${failedRepos.map(r => `  - ${r.owner}/${r.name} (${r.id})`).join("\n")}\n`);

const OLLAMA_URL = "http://repomind-ollama:11434";
const CHROMA_HOST = "chroma";
const CHROMA_PORT = 8000;

async function getBatchEmbedding(texts) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: texts }),
  });
  if (!res.ok) throw new Error(`Ollama batch embed error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embeddings;
}

async function ensureCollection(client, name) {
  return client.getOrCreateCollection({ name });
}

async function embedRepo(repo) {
  const { id: repoId, name, owner } = repo;
  console.log(`\n=== Processing ${owner}/${name} (${repoId}) ===`);

  // Get symbols
  const symbols = db.prepare("SELECT * FROM parsed_symbols WHERE repo_id = ?").all(repoId);
  if (symbols.length === 0) {
    console.log(`  No symbols found, skipping`);
    return;
  }
  console.log(`  Symbols: ${symbols.length}`);

  // Generate chunks
  const chunks = symbols.map(s => ({
    id: `chunk_${s.id}`,
    repoId: s.repo_id,
    symbolId: s.id,
    filePath: s.file_path,
    chunkType: "function",
    content: `Symbol: ${s.name} (${s.symbol_type})\nFile: ${s.file_path}\nSource:\n${s.source_code}`,
  }));

  // Update status to embedding
  db.prepare("UPDATE repositories SET embed_status = 'embedding' WHERE id = ?").run(repoId);

  // Batch generate embeddings
  const texts = chunks.map(c => c.content);
  console.log(`  Generating ${texts.length} embeddings...`);
  const start = Date.now();
  const embeddings = await getBatchEmbedding(texts);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Generated ${embeddings.length} embeddings, dim=${embeddings[0]?.length}, in ${elapsed}s`);

  // Upsert to Chroma
  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT, ssl: false });
  const collection = await ensureCollection(client, "code_chunks");
  console.log(`  Collection ready`);

  const ids = chunks.map(c => c.id);
  const metadatas = chunks.map(c => ({
    repoId: c.repoId,
    symbolId: c.symbolId,
    filePath: c.filePath,
    chunkType: c.chunkType,
  }));
  const documents = chunks.map(c => c.content);

  await collection.upsert({ ids, embeddings, metadatas, documents });
  console.log(`  Upserted ${ids.length} embeddings to Chroma`);

  // Update status to embedded
  db.prepare("UPDATE repositories SET embed_status = 'embedded' WHERE id = ?").run(repoId);
  console.log(`  Done!`);
}

async function main() {
  for (const repo of failedRepos) {
    try {
      await embedRepo(repo);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      db.prepare("UPDATE repositories SET embed_status = 'failed' WHERE id = ?").run(repo.id);
    }
  }
  console.log("\n=== All done! ===");
  const remaining = db.prepare("SELECT id, name, embed_status FROM repositories WHERE embed_status != 'embedded'").all();
  if (remaining.length > 0) {
    console.log("Remaining non-embedded repos:", remaining);
  } else {
    console.log("All repos are embedded!");
  }
  db.close();
}

main();
