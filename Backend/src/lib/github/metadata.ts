import { getGitHubClient } from "./client";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  isPrivate: boolean;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  license: string | null;
}

export async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const client = getGitHubClient();

  logger.debug("github", "Fetching repository metadata", { owner, repo });

  try {
    const response = await client.rest.repos.get({ owner, repo });

    const data = response.data;

    return {
      owner: data.owner?.login ?? owner,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      language: data.language,
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      isPrivate: data.private,
      topics: data.topics ?? [],
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
      pushedAt: data.pushed_at ?? new Date().toISOString(),
      size: data.size ?? 0,
      license: data.license?.spdx_id ?? null,
    };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      throw new NotFoundError(`Repository ${owner}/${repo} not found on GitHub`);
    }
    if (error instanceof Error && "status" in error && error.status === 403) {
      throw new NotFoundError(
        `Access denied to ${owner}/${repo}. The repository may be private or API rate limited.`,
      );
    }
    throw error;
  }
}
