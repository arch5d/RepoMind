import Database from "better-sqlite3";
import { ChromaClient } from "chromadb";

const db = new Database("/app/data/repomind.db");
const CHROMA_HOST = "chroma";
const CHROMA_PORT = 8000;

// Read config directly from env (already loaded in Docker container)
const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
const embedModel = process.env.NVIDIA_EMBED_MODEL || "nvidia/nv-embedqa-e5-v5";

if (!apiKey) {
  console.error("NVIDIA_API_KEY not set");
  process.exit(1);
}

async function getSingleEmbedding(text) {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: embedModel, input: text, input_type: "passage" }),
  });
  if (!res.ok) throw new Error(`NVIDIA embed error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function embedRepo(repo) {
  const { id: repoId, name, owner } = repo;
  console.log(`\n=== ${owner}/${name} (${repoId}) ===`);

  const symbols = db.prepare("SELECT * FROM parsed_symbols WHERE repo_id = ?").all(repoId);
  if (symbols.length === 0) { console.log("  No symbols"); return; }
  console.log(`  Symbols: ${symbols.length}`);

  // nv-embedqa-e5-v5 has 512 token limit; name can contain entire source code
  const MAX_TOTAL_CHARS = 550;
  const MAX_NAME_CHARS = 60;
  const MAX_FILE_CHARS = 80;
  const MAX_SOURCE_CHARS = 400;
  const chunks = symbols.map(s => {
    const name = (s.name || "").slice(0, MAX_NAME_CHARS);
    const filePath = (s.file_path || "").slice(0, MAX_FILE_CHARS);
    const code = s.source_code || "";
    let content = `Symbol: ${name} (${s.symbol_type})\nFile: ${filePath}\nSource:\n${code.slice(0, MAX_SOURCE_CHARS)}`;
    if (content.length > MAX_TOTAL_CHARS) {
      const prefixLen = `Symbol: ${name} (${s.symbol_type})\nFile: ${filePath}\nSource:\n`.length;
      const maxSourceLen = Math.max(0, MAX_TOTAL_CHARS - prefixLen - 20);
      content = `Symbol: ${name} (${s.symbol_type})\nFile: ${filePath}\nSource:\n${code.slice(0, maxSourceLen)}\n// ... truncated`;
    }
    return {
      id: `chunk_${s.id}`,
      repoId: s.repo_id,
      symbolId: s.id,
      filePath: s.file_path,
      chunkType: "function",
      content,
    };
  });
  const texts = chunks.map(c => c.content);

  db.prepare("UPDATE repositories SET embed_status = 'embedding' WHERE id = ?").run(repoId);

  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    process.stdout.write(`  [${i + 1}/${texts.length}]\r`);
    const emb = await getSingleEmbedding(texts[i]);
    embeddings.push(emb);
  }
  console.log(`  Generated ${embeddings.length} embeddings, dim=${embeddings[0]?.length}`);

  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT, ssl: false });
  const collection = await client.getOrCreateCollection({ name: "code_chunks" });

  const ids = chunks.map(c => c.id);
  const metadatas = chunks.map(c => ({
    repoId: c.repoId, symbolId: c.symbolId, filePath: c.filePath, chunkType: c.chunkType,
  }));
  await collection.upsert({ ids, embeddings, metadatas, documents: texts });
  console.log(`  Upserted ${ids.length} embeddings`);

  db.prepare("UPDATE repositories SET embed_status = 'embedded' WHERE id = ?").run(repoId);
  console.log("  Done!");
}

async function main() {
  const repos = db.prepare(
    "SELECT id, name, owner FROM repositories WHERE clone_status = 'cloned' AND parse_status = 'parsed' AND embed_status != 'embedded'"
  ).all();

  console.log(`Found ${repos.length} repos to embed:`);
  for (const r of repos) console.log(`  - ${r.owner}/${r.name}`);

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
