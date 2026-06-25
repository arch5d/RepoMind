import { createJob, updateJobStatus } from "@/lib/db/jobs";
import { createRepo, updateRepoStatus, getRepoByUrl } from "@/lib/db/repos";
import { parseGitHubUrl } from "@/lib/github/validation";
import { fetchRepoMetadata } from "@/lib/github/metadata";
import { cloneRepository, getRepoDir } from "@/lib/github/clone";
import { parseRepository } from "@/lib/parser/parser";
import { storeParseResult } from "@/lib/parser/parser-store";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { generateChunks } from "@/lib/embedding/chunker";
import { generateEmbeddings } from "@/lib/embedding/embedder";
import { upsertEmbeddings } from "@/lib/embedding/vector-store";
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
    logger.info("jobs.processor", "Parse job started", {
      jobId: parseJob.id,
      repoId,
    });

    updateJobStatus(parseJob.id, { status: "running", startedAt: now, progress: 5 });
    updateRepoStatus(repoId, { parseStatus: "parsing" });

    const repoDir = getRepoDir(repoId);

    const result = await parseRepository({
      repoId,
      repoDir,
      onProgress: (p: number) => {
        const scaled = 5 + Math.floor(p * 95);
        updateJobStatus(parseJob.id, { progress: Math.min(scaled, 99) });
      },
    });

    updateJobStatus(parseJob.id, { progress: 99 });

    storeParseResult(result);

    updateRepoStatus(repoId, { parseStatus: "parsed" });
    updateJobStatus(parseJob.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
    });

    logger.info("jobs.processor", "Parse completed, enqueuing embed", {
      repoId,
      jobId: parseJob.id,
      symbols: result.symbols.length,
      dependencies: result.dependencies.length,
    });

    processEmbeddingJob(repoId).catch((err) => {
      logger.error("jobs.processor", "Background embed job failed after parse", {
        repoId,
        error: String(err),
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    updateRepoStatus(repoId, { parseStatus: "failed" });
    updateJobStatus(parseJob.id, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });

    logger.error("jobs.processor", "Parse failed", { repoId, jobId: parseJob.id, error: errorMessage });
  }
}

async function processEmbeddingJob(repoId: string): Promise<void> {
  const embedJob = createJob(repoId, "embed");
  const now = new Date().toISOString();

  try {
    logger.info("jobs.processor", "Embedding started", {
      jobId: embedJob.id,
      repoId,
    });

    updateJobStatus(embedJob.id, { status: "running", startedAt: now, progress: 5 });
    updateRepoStatus(repoId, { embedStatus: "embedding" });

    const symbols = getSymbolsByRepo(repoId);

    const chunks = generateChunks(symbols);

    updateJobStatus(embedJob.id, { progress: 25 });

    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`);
    }

    updateJobStatus(embedJob.id, { progress: 50 });

    const records = chunks.map((chunk, i) => {
      const embedding = embeddings[i]!;
      return {
        id: chunk.id,
        repoId: chunk.repoId,
        symbolId: chunk.symbolId,
        filePath: chunk.filePath,
        chunkType: chunk.chunkType,
        embedding,
        content: chunk.content,
      };
    });

    await upsertEmbeddings(records);

    updateJobStatus(embedJob.id, { progress: 75 });

    updateRepoStatus(repoId, { embedStatus: "embedded" });
    updateJobStatus(embedJob.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
    });

    logger.info("jobs.processor", "Embedding completed", {
      repoId,
      jobId: embedJob.id,
      chunks: chunks.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    updateRepoStatus(repoId, { embedStatus: "failed" });
    updateJobStatus(embedJob.id, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });

    logger.error("jobs.processor", "Embedding failed", { repoId, jobId: embedJob.id, error: errorMessage });
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

    logger.info("jobs.processor", "Clone completed, enqueuing parse", { repoId });

    processParseJob(repoId).catch((err) => {
      logger.error("jobs.processor", "Background parse job failed after clone", {
        repoId,
        error: String(err),
      });
    });
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
