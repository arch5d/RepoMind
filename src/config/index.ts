type AIProviderType = "openai" | "ollama" | "nvidia";

interface AppConfig {
  app: {
    url: string;
    nodeEnv: string;
    isDev: boolean;
    isProd: boolean;
  };
  ai: {
    provider: AIProviderType;
    ollamaBaseUrl: string;
    ollamaChatModel: string;
    ollamaEmbedModel: string;
  };
  nvidia: {
    apiKey: string;
    baseUrl: string;
    chatModel: string;
    embedModel: string;
  };
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  chroma: {
    url: string;
    collections: {
      codeChunks: string;
      dependencyGraph: string;
      architectureNodes: string;
      documentationNodes: string;
    };
  };
  github: {
    token: string;
    apiBase: string;
  };
  database: {
    url: string;
  };
  jobs: {
    concurrency: number;
    cloneTimeoutMs: number;
    parseTimeoutMs: number;
  };
  logging: {
    level: string;
  };
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function optionalIntEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return parsed;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const nodeEnv = optionalEnv("NODE_ENV", "development");

  const config: AppConfig = {
    app: {
      url: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
      nodeEnv,
      isDev: nodeEnv === "development",
      isProd: nodeEnv === "production",
    },
    ai: {
      provider: optionalEnv("AI_PROVIDER", "openai") as AIProviderType,
      ollamaBaseUrl: optionalEnv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
      ollamaChatModel: optionalEnv("OLLAMA_CHAT_MODEL", "qwen3:8b"),
      ollamaEmbedModel: optionalEnv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
    },
    nvidia: {
      apiKey: optionalEnv("NVIDIA_API_KEY", ""),
      baseUrl: optionalEnv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
      chatModel: optionalEnv("NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct"),
      embedModel: optionalEnv("NVIDIA_EMBED_MODEL", "nvidia/nv-embedqa-e5-v5"),
    },
    openai: {
      apiKey: optionalEnv("OPENAI_API_KEY", ""),
      model: optionalEnv("OPENAI_MODEL", "gpt-4o-mini"),
      embeddingModel: optionalEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    },
    chroma: {
      url: optionalEnv("CHROMA_URL", "http://localhost:8000"),
      collections: {
        codeChunks: optionalEnv("CHROMA_COLLECTION_CODE_CHUNKS", "code_chunks"),
        dependencyGraph: optionalEnv("CHROMA_COLLECTION_DEPENDENCY_GRAPH", "dependency_graph"),
        architectureNodes: optionalEnv("CHROMA_COLLECTION_ARCHITECTURE_NODES", "architecture_nodes"),
        documentationNodes: optionalEnv("CHROMA_COLLECTION_DOCUMENTATION_NODES", "documentation_nodes"),
      },
    },
    github: {
      token: optionalEnv("GITHUB_TOKEN", ""),
      apiBase: optionalEnv("GITHUB_API_BASE", "https://api.github.com"),
    },
    database: {
      url: optionalEnv("DATABASE_URL", "file:./repomind.db"),
    },
    jobs: {
      concurrency: optionalIntEnv("JOB_CONCURRENCY", 3),
      cloneTimeoutMs: optionalIntEnv("JOB_CLONE_TIMEOUT_MS", 300_000),
      parseTimeoutMs: optionalIntEnv("JOB_PARSE_TIMEOUT_MS", 600_000),
    },
    logging: {
      level: optionalEnv("LOG_LEVEL", "info"),
    },
  };

  cachedConfig = config;
  return config;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export type { AppConfig };
