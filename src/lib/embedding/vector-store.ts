import { ChromaClient } from "chromadb";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";
import type { EmbeddingRecord, EmbeddingSearchResult } from "./embedding-types";

const COLLECTION_NAME = "repomind_code";

let _client: ChromaClient | null = null;

function parseChromaUrl(url: string): { host: string; port: number; ssl: boolean } {
  const parsed = new URL(url);
  return {
    ssl: parsed.protocol === "https:",
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || (parsed.protocol === "https:" ? 443 : 80),
  };
}

function getClient(): ChromaClient {
  if (!_client) {
    const config = getConfig();
    const { host, port, ssl } = parseChromaUrl(config.chroma.url);
    _client = new ChromaClient({ host, port, ssl });
  }
  return _client;
}

async function getCollection() {
  const client = getClient();
  return client.getOrCreateCollection({ name: COLLECTION_NAME });
}

export async function upsertEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return;

  const collection = await getCollection();

  const ids = records.map((r) => r.id);
  const embeddings = records.map((r) => r.embedding);
  const metadatas = records.map((r) => ({
    repoId: r.repoId,
    symbolId: r.symbolId,
    filePath: r.filePath,
    chunkType: r.chunkType,
  }));
  const documents = records.map((r) => r.content);

  await collection.upsert({
    ids,
    embeddings,
    metadatas,
    documents,
  });

  logger.info("vector-store", "Embeddings upserted", {
    collection: COLLECTION_NAME,
    count: records.length,
  });
}

export async function deleteRepoEmbeddings(repoId: string): Promise<void> {
  const collection = await getCollection();

  await collection.delete({
    where: { repoId },
  });

  logger.info("vector-store", "Repo embeddings deleted", {
    collection: COLLECTION_NAME,
    repoId,
  });
}

export async function queryEmbeddings(
  embedding: number[],
  limit: number = 10,
  filter?: { repoId?: string; chunkType?: string },
): Promise<EmbeddingSearchResult[]> {
  const collection = await getCollection();

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: limit,
    where: filter as Record<string, string> | undefined,
  });

  const records: EmbeddingSearchResult[] = [];

  if (!results || !results.ids || results.ids.length === 0) return records;

  for (let i = 0; i < (results.ids[0]?.length ?? 0); i++) {
    const id = results.ids[0]?.[i];
    const distance = results.distances?.[0]?.[i];
    const metadata = results.metadatas?.[0]?.[i];
    const content = results.documents?.[0]?.[i];

    if (!id || !metadata) continue;

    records.push({
      id,
      repoId: String(metadata.repoId ?? ""),
      symbolId: String(metadata.symbolId ?? ""),
      filePath: String(metadata.filePath ?? ""),
      chunkType: String(metadata.chunkType) as EmbeddingSearchResult["chunkType"],
      content: content ?? "",
      score: distance ?? 0,
    });
  }

  return records;
}
