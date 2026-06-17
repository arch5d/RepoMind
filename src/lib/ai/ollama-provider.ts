import { getConfig } from "@/config";
import type { AIProvider, ChatOptions, ProviderInfo } from "./types";

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

interface OllamaBatchEmbedResponse {
  model: string;
  embeddings: number[][];
}

const FETCH_TIMEOUT_MS = 300_000;

export function createOllamaProvider(): AIProvider {
  const config = getConfig();

  function baseUrl(): string {
    return config.ai.ollamaBaseUrl.replace(/\/+$/, "");
  }

  async function chat(options: ChatOptions): Promise<string> {
    const url = `${baseUrl()}/api/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        model: config.ai.ollamaChatModel,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userMessage },
        ],
        options: { temperature: options.temperature ?? 0.1 },
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(`Ollama chat returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content;
    if (!content) {
      throw new Error("Ollama returned empty chat response");
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
    const url = `${baseUrl()}/api/embeddings`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        model: config.ai.ollamaEmbedModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(`Ollama embeddings returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error("Ollama returned invalid embedding response");
    }
    return data.embedding;
  }

  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (texts.length === 1) return [await generateEmbedding(texts[0]!)];

    const url = `${baseUrl()}/api/embed`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * Math.ceil(texts.length / 10)),
      body: JSON.stringify({
        model: config.ai.ollamaEmbedModel,
        input: texts,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(`Ollama batch embeddings returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaBatchEmbedResponse;
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error("Ollama returned invalid batch embedding response");
    }
    if (data.embeddings.length !== texts.length) {
      throw new Error(
        `Ollama returned ${data.embeddings.length} embeddings for ${texts.length} texts`,
      );
    }
    return data.embeddings;
  }

  async function getProviderInfo(): Promise<ProviderInfo> {
    const info: ProviderInfo = {
      provider: "ollama",
      model: config.ai.ollamaChatModel,
      embeddingModel: config.ai.ollamaEmbedModel,
      status: "ok",
    };

    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl()}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return { ...info, status: "error", error: `Ollama returned ${response.status}`, latencyMs: Date.now() - start };
      }
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models ?? [];
      const chatFound = models.some((m) => m.name.startsWith(config.ai.ollamaChatModel));
      const embedFound = models.some((m) => m.name.startsWith(config.ai.ollamaEmbedModel));
      const warnings: string[] = [];
      if (!chatFound) warnings.push(`Chat model "${config.ai.ollamaChatModel}" not found`);
      if (!embedFound) warnings.push(`Embed model "${config.ai.ollamaEmbedModel}" not found`);
      return {
        ...info,
        status: warnings.length === 0 ? "ok" : "error",
        error: warnings.length > 0 ? warnings.join("; ") : undefined,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        ...info,
        status: "error",
        error: error instanceof Error ? error.message : "Connection failed",
        latencyMs: Date.now() - start,
      };
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
