import fs from "node:fs";
import path from "node:path";
import { logger } from "@/lib/logger";

interface Settings {
  chatModel: string;
  embedModel: string;
}

const SETTINGS_PATH = path.resolve(process.cwd(), "settings.json");

const DEFAULTS: Settings = {
  chatModel: "meta/llama-3.1-8b-instruct",
  embedModel: "nvidia/nv-embedqa-e5-v5",
};

function loadFile(): Partial<Settings> {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as Partial<Settings>;
    }
  } catch { /* ignore */ }
  return {};
}

function saveFile(data: Partial<Settings>): void {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    logger.error("settings", "Failed to save settings", { error: String(e) });
  }
}

let cached: Settings | null = null;

export function getSettings(): Settings {
  if (cached) return cached;
  const file = loadFile();
  cached = { ...DEFAULTS, ...file };
  return cached;
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = loadFile();
  const merged = { ...DEFAULTS, ...current, ...partial };
  saveFile(merged);
  cached = merged;
  logger.info("settings", "Settings updated", merged);
  return merged;
}

export const NIM_CHAT_MODELS = [
  { id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
  { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B" },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "mistralai/mistral-7b-instruct-v0.3", label: "Mistral 7B" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B" },
  { id: "nvidia/nemotron-4-340b-instruct", label: "Nemotron 4 340B" },
  { id: "microsoft/phi-3-medium-128k-instruct", label: "Phi-3 Medium 128K" },
  { id: "google/gemma-2-27b-it", label: "Gemma 2 27B" },
  { id: "qwen/qwen2.5-72b-instruct", label: "Qwen 2.5 72B" },
  { id: "deepseek-ai/deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B" },
];

export const NIM_EMBED_MODELS = [
  { id: "nvidia/nv-embedqa-e5-v5", label: "NV-EmbedQA-E5 v5" },
  { id: "nvidia/nv-embedqa-mistral-7b-v2", label: "NV-EmbedQA Mistral 7B v2" },
];
