import { CloudClient } from "chromadb";

async function main() {
  const client = new CloudClient();

  const names = ["code_chunks", "dependency_graph", "architecture_nodes", "documentation_nodes"];

  for (const name of names) {
    try {
      const col = await client.getCollection({ name });
      const count = await col.count();

      let sampleDim = "N/A";
      if (count > 0) {
        const records = await col.get({ limit: 1, include: ["embeddings"] });
        const emb = records.embeddings?.[0];
        if (emb) sampleDim = String(emb.length);
      }

      console.log(`${name}:`);
      console.log(`  id:        ${col.id}`);
      console.log(`  records:   ${count}`);
      console.log(`  embed_dim: ${sampleDim}`);
      console.log();
    } catch (e) {
      console.log(`${name}: ERROR - ${e instanceof Error ? e.message : e}\n`);
    }
  }
}

main();
