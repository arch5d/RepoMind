import { CloudClient } from "chromadb";

const client = new CloudClient();

const name = "code_chunks";
try {
  await client.deleteCollection({ name });
  console.log(`Deleted collection: ${name}`);
} catch (e) {
  console.log(`Error deleting ${name}: ${e.message}`);
}

const remaining = await client.listCollections();
console.log("Remaining collections:", remaining.map(c => c.name));
