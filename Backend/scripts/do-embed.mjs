import Database from "better-sqlite3";
import { CloudClient } from "chromadb";

const REPO_ID = process.argv[2] || "bc2040f8-38d1-4ff0-ad83-37c5281a99c7";
const DB_PATH = "/app/data/repomind.db";

const db = new Database(DB_PATH);

// 1. Get symbols
const symbols = db.prepare("SELECT * FROM parsed_symbols WHERE repo_id = ?").all(REPO_ID);
console.log(`Found ${symbols.length} symbols for ${REPO_ID}`);

// 2. Simple chunker: one chunk per symbol
const chunks = symbols.map((s) => ({
  id: `chunk_${s.id}`,
  repoId: s.repo_id,
  symbolId: s.id,
  filePath: s.file_path,
  chunkType: "function",
  content: `Symbol: ${s.name} (${s.symbol_type})\nFile: ${s.file_path}\nSource:\n${s.source_code}`,
}));
console.log(`Generated ${chunks.length} chunks`);

// 3. Generate embeddings via Ollama
async function getEmbedding(text) {
  const res = await fetch("http://repomind-ollama:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding;
}

async function main() {
  // Update status
  db.prepare("UPDATE repositories SET embed_status = 'embedding' WHERE id = ?").run(REPO_ID);

  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1}/${chunks.length}...`);
    const emb = await getEmbedding(chunks[i].content);
    embeddings.push(emb);
  }
  console.log(`Generated ${embeddings.length} embeddings, dim=${embeddings[0]?.length}`);

  // 4. Upsert to Chroma Cloud
  const collectionName = process.env.CHROMA_COLLECTION_CODE_CHUNKS || "code_chunks";
  const client = new CloudClient();

  // Delete old collection if exists (to change dimension)
  try {
    const existing = await client.getCollection({ name: collectionName });
    if (existing) {
      await client.deleteCollection({ name: collectionName });
      console.log(`Deleted old collection: ${collectionName}`);
    }
  } catch {
    // Collection doesn't exist, will create below
  }

  const collection = await client.getOrCreateCollection({ name: collectionName });
  console.log(`Collection ready: ${collectionName}`);

  const ids = chunks.map(c => c.id);
  const metadatas = chunks.map(c => ({
    repoId: c.repoId,
    symbolId: c.symbolId,
    filePath: c.filePath,
    chunkType: c.chunkType,
  }));
  const documents = chunks.map(c => c.content);

  await collection.add({ ids, embeddings, metadatas, documents });
  console.log(`Upserted ${ids.length} embeddings to Chroma Cloud`);

  // 5. Update status
  db.prepare("UPDATE repositories SET embed_status = 'embedded' WHERE id = ?").run(REPO_ID);
  console.log("Embedding completed successfully!");

  db.close();
}

main().catch(async (err) => {
  console.error("Embedding failed:", err.message);
  db.prepare("UPDATE repositories SET embed_status = 'failed' WHERE id = ?").run(REPO_ID);
  db.close();
  process.exit(1);
});
