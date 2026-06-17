import { getAIProvider } from "@/lib/ai/provider";

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getAIProvider();
  return provider.generateEmbedding(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = getAIProvider();
  return provider.generateEmbeddings(texts);
}
