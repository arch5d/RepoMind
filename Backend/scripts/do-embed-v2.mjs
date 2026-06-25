import { ChromaClient } from "chromadb";

async function main() {
  const client = new ChromaClient({
    host: "chroma",
    port: 8000,
    ssl: false,
  });

  // List collections
  const collections = await client.listCollections();
  console.log("Collections:", collections);

  // Delete and recreate code_chunks
  const collectionName = "code_chunks";
  
  try {
    const existing = await client.getCollection({ name: collectionName });
    await client.deleteCollection({ name: collectionName });
    console.log(`Deleted collection: ${collectionName}`);
  } catch (e) {
    console.log(`Collection ${collectionName} does not exist, creating new`);
  }

  const collection = await client.getOrCreateCollection({
    name: collectionName,
  });
  console.log(`Collection ready: ${collectionName}`);

  // Now do the embedding
  const Database = (await import("better-sqlite3")).default;
  const db = new Database("/app/data/repomind.db");
  const repoId = process.argv[2] || "bc2040f8-38d1-4ff0-ad83-37c5281a99c7";

  const symbols = db.prepare("SELECT * FROM parsed_symbols WHERE repo_id = ?").all(repoId);
  console.log(`Found ${symbols.length} symbols`);

  const chunks = symbols.map(s => ({
    id: `chunk_${s.id}`,
    repoId: s.repo_id,
    symbolId: s.id,
    filePath: s.file_path,
    chunkType: "function",
    content: `Symbol: ${s.name} (${s.symbol_type})\nFile: ${s.file_path}\nSource:\n${s.source_code}`,
  }));

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

  db.prepare("UPDATE repositories SET embed_status = 'embedding' WHERE id = ?").run(repoId);

  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`Embedding ${i + 1}/${chunks.length}...\r`);
    const emb = await getEmbedding(chunks[i].content);
    embeddings.push(emb);
  }
  console.log(`\nGenerated ${embeddings.length} embeddings, dim=${embeddings[0].length}`);

  // Upsert using chromadb client
  const ids = chunks.map(c => c.id);
  const metadatas = chunks.map(c => ({
    repoId: c.repoId,
    symbolId: c.symbolId,
    filePath: c.filePath,
    chunkType: c.chunkType,
  }));
  const documents = chunks.map(c => c.content);

  await collection.upsert({ ids, embeddings, metadatas, documents });
  console.log(`Upserted ${ids.length} embeddings to Chroma`);

  db.prepare("UPDATE repositories SET embed_status = 'embedded' WHERE id = ?").run(repoId);
  console.log("Embedding completed successfully!");
  db.close();
}

main().catch(async (err) => {
  console.error("\nEmbedding failed:", err.message);
  const Database = (await import("better-sqlite3")).default;
  const db = new Database("/app/data/repomind.db");
  db.prepare("UPDATE repositories SET embed_status = 'failed' WHERE id = ?").run(process.argv[2] || "");
  db.close();
  process.exit(1);
});
