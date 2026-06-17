import OpenAI from "openai";
import { getConfig } from "@/config";
import type { AIProvider, ChatOptions, ProviderInfo } from "./types";

export function createOpenAIProvider(): AIProvider {
  const config = getConfig();
  let _client: OpenAI | null = null;

  function getClient(): OpenAI {
    if (!_client) {
      _client = new OpenAI({
        apiKey: config.openai.apiKey,
        timeout: 30_000,
        maxRetries: 2,
      });
    }
    return _client;
  }

  async function chat(options: ChatOptions): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: config.openai.model,
      temperature: options.temperature ?? 0.1,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    return content;
  }

  async function chatWithJSON<T>(options: ChatOptions): Promise<T> {
    const text = await chat({
      ...options,
      systemPrompt: `${options.systemPrompt}\nRespond with valid JSON only. No markdown, no explanation.`,
    });
    return JSON.parse(text) as T;
  }

  async function generateEmbedding(text: string): Promise<number[]> {
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

  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
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

  async function getProviderInfo(): Promise<ProviderInfo> {
    const info: ProviderInfo = {
      provider: "openai",
      model: config.openai.model,
      embeddingModel: config.openai.embeddingModel,
      status: "ok",
    };

    if (!config.openai.apiKey) {
      return { ...info, status: "error", error: "OPENAI_API_KEY not configured" };
    }

    const start = Date.now();
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${config.openai.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return { ...info, status: "error", error: `OpenAI returned ${response.status}`, latencyMs: Date.now() - start };
      }
      return { ...info, latencyMs: Date.now() - start };
    } catch (error) {
      return { ...info, status: "error", error: error instanceof Error ? error.message : "Connection failed", latencyMs: Date.now() - start };
    }
  }

  return {
    chat,
    chatWithJSON,
    generateEmbedding,
    generateEmbeddings,
    getProviderInfo,
  };
}
