interface AppConfig {
  api: {
    baseUrl: string;
  };
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export function getConfig(): AppConfig {
  return {
    api: {
      baseUrl: optionalEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001"),
    },
  };
}

export type { AppConfig };
