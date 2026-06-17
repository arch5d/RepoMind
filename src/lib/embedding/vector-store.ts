import { ChromaClient } from "chromadb";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";
import type { EmbeddingRecord, EmbeddingSearchResult } from "./embedding-types";

const noopEmbeddingFunction = {
  generate: async (_texts: string[]) => [] as number[][],
};

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
  const config = getConfig();
  const client = getClient();
  return client.getOrCreateCollection({
    name: config.chroma.collections.codeChunks,
    embeddingFunction: noopEmbeddingFunction,
  });
}

async function getCollectionByName(name: string) {
  const client = getClient();
  try {
    return await client.getCollection({ name, embeddingFunction: noopEmbeddingFunction });
  } catch {
    return null;
  }
}

export async function upsertEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return;

  const config = getConfig();
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
    collection: config.chroma.collections.codeChunks,
    count: records.length,
  });
}

export async function deleteRepoEmbeddings(repoId: string): Promise<void> {
  const collection = await getCollection();

  await collection.delete({
    where: { repoId },
  });

  logger.info("vector-store", "Repo embeddings deleted", {
    repoId,
  });
}

export async function getEmbeddings(ids: string[]): Promise<EmbeddingRecord[]> {
  const collection = await getCollection();
  const results = await collection.get({ ids, include: ["embeddings", "metadatas", "documents"] });

  const records: EmbeddingRecord[] = [];
  if (!results || !results.ids) return records;

  for (let i = 0; i < results.ids.length; i++) {
    const id = results.ids[i];
    const embedding = results.embeddings?.[i];
    const metadata = results.metadatas?.[i];
    const content = results.documents?.[i];
    if (!id || !embedding || !metadata) continue;
    records.push({
      id,
      repoId: String(metadata.repoId ?? ""),
      symbolId: String(metadata.symbolId ?? ""),
      filePath: String(metadata.filePath ?? ""),
      chunkType: String(metadata.chunkType) as EmbeddingRecord["chunkType"],
      embedding: Array.isArray(embedding) ? (embedding as number[]) : JSON.parse(embedding as string),
      content: content ?? "",
    });
  }

  return records;
}

export async function queryCollection(
  collectionName: string,
  embedding: number[],
  limit: number = 10,
  filter?: { repoId?: string; chunkType?: string },
): Promise<EmbeddingSearchResult[]> {
  const collection = await getCollectionByName(collectionName);
  if (!collection) return [];

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

export async function ensureCollections(): Promise<void> {
  const config = getConfig();
  const client = getClient();
  const required = [
    config.chroma.collections.codeChunks,
    config.chroma.collections.dependencyGraph,
    config.chroma.collections.architectureNodes,
    config.chroma.collections.documentationNodes,
  ];
  for (const name of required) {
    try {
      await client.getOrCreateCollection({
        name,
        embeddingFunction: noopEmbeddingFunction,
      });
      logger.info("vector-store", "Collection ready", { name });
    } catch (error) {
      logger.error("vector-store", "Failed to ensure collection", {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
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
