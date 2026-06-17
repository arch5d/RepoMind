import { getAIProvider } from "@/lib/ai/provider";

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  temperature = 0.1,
): Promise<string> {
  const provider = getAIProvider();
  return provider.chat({ systemPrompt, userMessage, temperature });
}

export async function callLLMWithJSON<T>(
  systemPrompt: string,
  userMessage: string,
): Promise<T> {
  const provider = getAIProvider();
  return provider.chatWithJSON<T>({ systemPrompt, userMessage, temperature: 0.1 });
}
