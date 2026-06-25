import OpenAI from "openai";
import { getConfig } from "@/config";
import { getSettings } from "@/lib/settings";
import type { AIProvider, ChatOptions, ProviderInfo } from "./types";

interface NIMEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

export function createNVIDIAProvider(): AIProvider {
  const config = getConfig();
  let _client: OpenAI | null = null;

  function getClient(): OpenAI {
    if (!_client) {
      _client = new OpenAI({
        apiKey: config.nvidia.apiKey,
        baseURL: config.nvidia.baseUrl,
        timeout: 60_000,
        maxRetries: 2,
      });
    }
    return _client;
  }

  async function postEmbeddings(body: unknown): Promise<NIMEmbeddingResponse> {
    const url = `${config.nvidia.baseUrl.replace(/\/+$/, "")}/embeddings`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.nvidia.apiKey}`,
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(`NVIDIA NIM embeddings returned ${response.status}: ${text}`);
    }
    return response.json() as Promise<NIMEmbeddingResponse>;
  }

  function activeChatModel(): string {
    try { return getSettings().chatModel; } catch { return config.nvidia.chatModel; }
  }

  function activeEmbedModel(): string {
    try { return getSettings().embedModel; } catch { return config.nvidia.embedModel; }
  }

  async function chat(options: ChatOptions): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: activeChatModel(),
      temperature: options.temperature ?? 0.1,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("NVIDIA NIM returned empty chat response");
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
    const data = await postEmbeddings({
      model: activeEmbedModel(),
      input: text,
      input_type: "query",
    });
    const embedding = data.data[0]?.embedding;
    if (!embedding) {
      throw new Error("NVIDIA NIM embedding response missing embedding data");
    }
    return embedding;
  }

  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const data = await postEmbeddings({
      model: activeEmbedModel(),
      input: texts,
      input_type: "passage",
    });
    data.data.sort((a, b) => a.index - b.index);
    const embeddings: number[][] = [];
    for (const item of data.data) {
      if (!item.embedding) {
        throw new Error(`NVIDIA NIM embedding missing at index ${item.index}`);
      }
      embeddings.push(item.embedding);
    }
    return embeddings;
  }

  async function getProviderInfo(): Promise<ProviderInfo> {
    const info: ProviderInfo = {
      provider: "nvidia",
      model: activeChatModel(),
      embeddingModel: activeEmbedModel(),
      status: "ok",
    };

    if (!config.nvidia.apiKey) {
      return { ...info, status: "error", error: "NVIDIA_API_KEY not configured" };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${config.nvidia.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.nvidia.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return { ...info, status: "error", error: `NVIDIA NIM returned ${response.status}`, latencyMs: Date.now() - start };
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
