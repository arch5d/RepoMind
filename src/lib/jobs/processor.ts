import { createJob, updateJobStatus } from "@/lib/db/jobs";
import { createRepo, updateRepoStatus, getRepoByUrl } from "@/lib/db/repos";
import { parseGitHubUrl } from "@/lib/github/validation";
import { fetchRepoMetadata } from "@/lib/github/metadata";
import { cloneRepository, getRepoDir } from "@/lib/github/clone";
import { parseRepository } from "@/lib/parser/parser";
import { storeParseResult } from "@/lib/parser/parser-store";
import { logger } from "@/lib/logger";
import type { Repository, Job } from "@/types/repo";

export interface SubmitRepoResult {
  repo: Repository;
  job: Job;
  existed: boolean;
}

export async function submitRepo(githubUrl: string, branch?: string): Promise<SubmitRepoResult> {
  const { owner, repo: repoName, url: cleanUrl } = parseGitHubUrl(githubUrl);

  const existing = getRepoByUrl(cleanUrl);
  if (existing) {
    const job = createJob(existing.id, "clone");
    processCloneJob(job.id, existing.id, owner, repoName, branch).catch((err) => {
      logger.error("jobs.processor", "Background clone failed for existing repo", {
        repoId: existing.id,
        error: String(err),
      });
    });

    return { repo: existing, job, existed: true };
  }

  const repo = createRepo({
    githubUrl: cleanUrl,
    owner,
    name: repoName,
    defaultBranch: branch || "main",
    description: null,
    language: null,
    stars: 0,
  });

  updateRepoStatus(repo.id, { cloneStatus: "queued" as const });

  const job = createJob(repo.id, "clone");

  processCloneJob(job.id, repo.id, owner, repoName, branch).catch((err) => {
    logger.error("jobs.processor", "Background clone failed", {
      repoId: repo.id,
      error: String(err),
    });
  });

  return { repo, job, existed: false };
}

async function processParseJob(repoId: string): Promise<void> {
  const parseJob = createJob(repoId, "parse");
  const now = new Date().toISOString();

  try {
    updateJobStatus(parseJob.id, { status: "running", startedAt: now, progress: 10 });
    updateRepoStatus(repoId, { parseStatus: "parsing" });

    const repoDir = getRepoDir(repoId);

    const result = await parseRepository({
      repoId,
      repoDir,
    });

    storeParseResult(result);

    updateRepoStatus(repoId, { parseStatus: "parsed" });
    updateJobStatus(parseJob.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
    });

    logger.info("jobs.processor", "Parse job completed", {
      repoId,
      symbols: result.symbols.length,
      dependencies: result.dependencies.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    updateRepoStatus(repoId, { parseStatus: "failed" });
    updateJobStatus(parseJob.id, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });

    logger.error("jobs.processor", "Parse job failed", { repoId, error: errorMessage });
  }
}

async function processCloneJob(
  jobId: string,
  repoId: string,
  owner: string,
  repo: string,
  branch?: string,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    updateJobStatus(jobId, { status: "running", startedAt: now, progress: 5 });
    updateRepoStatus(repoId, { cloneStatus: "cloning" });

    const metadata = await fetchRepoMetadata(owner, repo);

    updateRepoStatus(repoId, {
      defaultBranch: metadata.defaultBranch,
      description: metadata.description,
      language: metadata.language,
      stars: metadata.stars,
    });

    updateJobStatus(jobId, { progress: 20 });

    await cloneRepository(
      { repoId, owner, repo, branch: branch || metadata.defaultBranch },
      (progress) => {
        const scaledProgress = 20 + Math.floor(progress.progress * 0.75);
        updateJobStatus(jobId, { progress: scaledProgress });
      },
    );

    updateRepoStatus(repoId, {
      cloneStatus: "cloned",
      lastSyncedAt: new Date().toISOString(),
    });

    updateJobStatus(jobId, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
    });

    logger.info("jobs.processor", "Clone job completed, starting parse", { repoId });

    await processParseJob(repoId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    updateRepoStatus(repoId, { cloneStatus: "failed" });
    updateJobStatus(jobId, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });

    logger.error("jobs.processor", "Clone job failed", { repoId, error: errorMessage });
  }
}
