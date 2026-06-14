import { extractOwnerAndRepo } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  url: string;
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl {
  let url = input.trim();

  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("git@")) {
    url = `https://github.com/${url}`;
  }

  let owner: string;
  let repo: string;

  if (url.startsWith("git@")) {
    const match = url.match(/git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/);
    if (!match) {
      throw new ValidationError("Invalid GitHub SSH URL format. Expected: git@github.com:owner/repo");
    }
    owner = match[1]!;
    repo = match[2]!.replace(/\.git$/, "");
  } else {
    const parsed = extractOwnerAndRepo(url);
    if (!parsed) {
      throw new ValidationError(
        "Invalid GitHub URL. Expected: https://github.com/owner/repo or owner/repo",
      );
    }
    owner = parsed.owner;
    repo = parsed.repo;
  }

  const cleanUrl = `https://github.com/${owner}/${repo}`;

  return { owner, repo, url: cleanUrl };
}
