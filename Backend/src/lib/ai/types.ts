export type AIProviderType = "openai" | "ollama" | "nvidia";

export interface ChatOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}

export interface ProviderInfo {
  provider: AIProviderType;
  model: string;
  embeddingModel: string;
  status: "ok" | "error";
  error?: string;
  latencyMs?: number;
}

export interface AIProvider {
  chat(options: ChatOptions): Promise<string>;
  chatWithJSON<T>(options: ChatOptions): Promise<T>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getProviderInfo(): Promise<ProviderInfo>;
}
