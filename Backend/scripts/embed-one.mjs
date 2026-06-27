import Database from "better-sqlite3";
import { CloudClient } from "chromadb";

const db = new Database("/app/data/repomind.db");
const OLLAMA_URL = "http://repomind-ollama:11434";
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

  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  [${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(texts.length/BATCH_SIZE)}] ${batch.length} texts...`);
    const embs = await getBatchEmbedding(batch);
    allEmbeddings.push(...embs);
  }
  console.log(`  Total: ${allEmbeddings.length} embeddings, dim=${allEmbeddings[0]?.length}`);

  const client = new CloudClient();
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

const repoId = process.argv[2];
if (!repoId) { console.error("Usage: node script <repoId>"); process.exit(1); }

const repo = db.prepare("SELECT id, name, owner FROM repositories WHERE id = ?").get(repoId);
if (!repo) { console.error(`Repo ${repoId} not found`); process.exit(1); }

embedRepo(repo).then(() => { db.close(); }).catch(err => {
  console.error(`FAILED: ${err.message}`);
  db.prepare("UPDATE repositories SET embed_status = 'failed' WHERE id = ?").run(repo.id);
  db.close();
  process.exit(1);
});
