import { CloudClient } from "chromadb";
import dotenv from "dotenv";

dotenv.config();

const client = new CloudClient();

export function getCloudClient(): CloudClient {
  return client;
}

export async function getOrCreateCollection(name: string) {
  return client.getOrCreateCollection({ name });
}

export async function getCollection(name: string) {
  try {
    return await client.getCollection({ name });
  } catch {
    return null;
  }
}
