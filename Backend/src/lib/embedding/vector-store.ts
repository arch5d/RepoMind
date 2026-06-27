import { getConfig } from "@/config";
import { getCloudClient, getOrCreateCollection, getCollection as getChromaCollection } from "@/config/chroma";
import { logger } from "@/lib/logger";
import type { EmbeddingRecord, EmbeddingSearchResult } from "./embedding-types";

async function getDefaultCollection() {
  const config = getConfig();
  return getOrCreateCollection(config.chroma.collections.codeChunks);
}

async function getCollectionByName(name: string) {
  return getChromaCollection(name);
}

export async function upsertEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return;

  const config = getConfig();
  const collection = await getDefaultCollection();

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
  const collection = await getDefaultCollection();

  await collection.delete({
    where: { repoId },
  });

  logger.info("vector-store", "Repo embeddings deleted", {
    repoId,
  });
}

export async function getEmbeddings(ids: string[]): Promise<EmbeddingRecord[]> {
  const collection = await getDefaultCollection();
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
  const client = getCloudClient();
  const required = [
    config.chroma.collections.codeChunks,
    config.chroma.collections.dependencyGraph,
    config.chroma.collections.architectureNodes,
    config.chroma.collections.documentationNodes,
  ];
  for (const name of required) {
    try {
      await client.getOrCreateCollection({ name });
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
  const collection = await getDefaultCollection();

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
