import Database from "better-sqlite3";
import { ChromaClient } from "chromadb";

const db = new Database("/app/data/repomind.db");
const OLLAMA_URL = "http://repomind-ollama:11434";
const CHROMA_HOST = "chroma";
const CHROMA_PORT = 8000;
const BATCH_SIZE = 100;

async function getBatchEmbedding(texts) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: texts }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embeddings;
}

async function embedRepo(repo) {
  const { id: repoId, name, owner } = repo;
  console.log(`\n=== ${owner}/${name} (${repoId}) ===`);

  const symbols = db.prepare("SELECT * FROM parsed_symbols WHERE repo_id = ?").all(repoId);
  if (symbols.length === 0) { console.log("  No symbols"); return; }
  console.log(`  Symbols: ${symbols.length}`);

  const chunks = symbols.map(s => ({
    id: `chunk_${s.id}`,
    repoId: s.repo_id,
    symbolId: s.id,
    filePath: s.file_path,
    chunkType: "function",
    content: `Symbol: ${s.name} (${s.symbol_type})\nFile: ${s.file_path}\nSource:\n${s.source_code}`,
  }));
  const texts = chunks.map(c => c.content);

  db.prepare("UPDATE repositories SET embed_status = 'embedding' WHERE id = ?").run(repoId);

  // Batch embeddings in groups of BATCH_SIZE
  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  Embedding batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(texts.length/BATCH_SIZE)} (${batch.length} texts)...`);
    const embs = await getBatchEmbedding(batch);
    allEmbeddings.push(...embs);
    console.log(`    Got ${embs.length} embeddings`);
  }
  console.log(`  Total: ${allEmbeddings.length} embeddings, dim=${allEmbeddings[0]?.length}`);

  // Upsert to Chroma
  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT, ssl: false });
  const collection = await client.getOrCreateCollection({ name: "code_chunks" });

  const ids = chunks.map(c => c.id);
  const metadatas = chunks.map(c => ({
    repoId: c.repoId, symbolId: c.symbolId, filePath: c.filePath, chunkType: c.chunkType,
  }));
  await collection.upsert({ ids, embeddings: allEmbeddings, metadatas, documents: texts });
  console.log(`  Upserted ${ids.length} embeddings`);

  db.prepare("UPDATE repositories SET embed_status = 'embedded' WHERE id = ?").run(repoId);
  console.log("  Done!");
}

async function main() {
  const targetIds = process.argv.slice(2);
  let repos;
  if (targetIds.length > 0) {
    repos = targetIds.map(id => db.prepare("SELECT id, name, owner FROM repositories WHERE id = ?").get(id)).filter(Boolean);
  } else {
    repos = db.prepare("SELECT id, name, owner FROM repositories WHERE embed_status IN ('failed', 'pending')").all();
  }

  for (const repo of repos) {
    try {
      await embedRepo(repo);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      db.prepare("UPDATE repositories SET embed_status = 'failed' WHERE id = ?").run(repo.id);
    }
  }
  console.log("\n=== Final status ===");
  const all = db.prepare("SELECT name, embed_status FROM repositories ORDER BY name").all();
  for (const r of all) console.log(`  ${r.name}: ${r.embed_status}`);
  db.close();
}

main();
