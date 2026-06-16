import OpenAI from "openai";
import { getConfig } from "@/config";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const config = getConfig();
    _client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return _client;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = getConfig();
  const client = getClient();

  const response = await client.embeddings.create({
    model: config.openai.embeddingModel,
    input: text,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI embedding response missing embedding data");
  }
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = getConfig();
  const client = getClient();

  const response = await client.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts,
  });

  response.data.sort((a, b) => a.index - b.index);

  const embeddings: number[][] = [];
  for (const item of response.data) {
    if (!item.embedding) {
      throw new Error(`OpenAI embedding missing at index ${item.index}`);
    }
    embeddings.push(item.embedding);
  }
  return embeddings;
}
