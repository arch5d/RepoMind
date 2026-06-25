import path from "node:path";
import fs from "node:fs";
import simpleGit from "simple-git";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";

const CLONE_BASE_DIR = path.join(process.cwd(), "data", "repos");

export interface CloneOptions {
  repoId: string;
  owner: string;
  repo: string;
  branch?: string;
  githubToken?: string;
}

export function getRepoDir(repoId: string): string {
  return path.join(CLONE_BASE_DIR, repoId);
}

function ensureCloneDir(): void {
  if (!fs.existsSync(CLONE_BASE_DIR)) {
    fs.mkdirSync(CLONE_BASE_DIR, { recursive: true });
  }
}

function buildCloneUrl(owner: string, repo: string, token?: string): string {
  if (token) {
    return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  }
  return `https://github.com/${owner}/${repo}.git`;
}

export interface CloneProgress {
  stage: string;
  progress: number;
}

export type ProgressCallback = (progress: CloneProgress) => void;

export async function cloneRepository(
  options: CloneOptions,
  onProgress?: ProgressCallback,
): Promise<string> {
  ensureCloneDir();

  const repoDir = getRepoDir(options.repoId);

  if (fs.existsSync(repoDir)) {
    logger.info("github.clone", "Removing existing clone directory", { path: repoDir });
    fs.rmSync(repoDir, { recursive: true, force: true });
  }

  const config = getConfig();
  const token = options.githubToken || config.github.token || undefined;
  const cloneUrl = buildCloneUrl(options.owner, options.repo, token);
  const branch = options.branch || "main";

  logger.info("github.clone", "Starting clone", {
    owner: options.owner,
    repo: options.repo,
    branch,
    dest: repoDir,
  });

  onProgress?.({ stage: "cloning", progress: 10 });

  const git = simpleGit();

  const depth = token ? undefined : 1;

  const cloneOptions: string[] = ["--branch", branch, "--single-branch"];
  if (depth !== undefined) {
    cloneOptions.push("--depth", String(depth));
  }

  try {
    await git.clone(cloneUrl, repoDir, cloneOptions);

    onProgress?.({ stage: "cloning", progress: 80 });

    const gitInstance = simpleGit(repoDir);
    await gitInstance.raw(["config", "--local", "core.longpaths", "true"]);

    onProgress?.({ stage: "verifying", progress: 90 });

    const status = await simpleGit(repoDir).status();
    logger.info("github.clone", "Clone completed", {
      owner: options.owner,
      repo: options.repo,
      files: status.files.length,
      currentBranch: status.current,
    });

    onProgress?.({ stage: "complete", progress: 100 });

    return repoDir;
  } catch (error) {
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error("github.clone", "Clone failed", {
      owner: options.owner,
      repo: options.repo,
      error: message,
    });

    throw new Error(`Failed to clone repository: ${message}`);
  }
}
