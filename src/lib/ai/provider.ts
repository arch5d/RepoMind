import { getConfig } from "@/config";
import { createOpenAIProvider } from "./openai-provider";
import { createOllamaProvider } from "./ollama-provider";
import { createNVIDIAProvider } from "./nim-provider";
import type { AIProvider, AIProviderType } from "./types";

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const config = getConfig();
  _provider = createProvider(config.ai.provider);
  return _provider;
}

export function createProvider(type: AIProviderType): AIProvider {
  switch (type) {
    case "openai":
      return createOpenAIProvider();
    case "ollama":
      return createOllamaProvider();
    case "nvidia":
      return createNVIDIAProvider();
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}

export function resetProvider(): void {
  _provider = null;
}

export { type AIProvider, type AIProviderType } from "./types";
