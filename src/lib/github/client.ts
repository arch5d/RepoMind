import { Octokit } from "octokit";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";

let _client: Octokit | null = null;

export function getGitHubClient(): Octokit {
  if (_client) return _client;

  const config = getConfig();
  const auth = config.github.token || undefined;

  _client = new Octokit({
    auth,
    baseUrl: config.github.apiBase,
  });

  logger.info("github", "GitHub client initialized", {
    authenticated: !!auth,
    apiBase: config.github.apiBase,
  });

  return _client;
}

export function resetClient(): void {
  _client = null;
}
