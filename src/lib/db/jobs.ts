import { getDb } from "./index";
import { generateId } from "@/lib/utils";
import type { Job, JobType, JobStatus } from "@/types/repo";

interface JobRow {
  id: string;
  repo_id: string;
  type: string;
  status: string;
  error: string | null;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    repoId: row.repo_id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    error: row.error,
    progress: row.progress,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function createJob(repoId: string, type: JobType): Job {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO jobs (id, repo_id, type, status, progress, created_at)
    VALUES (?, ?, ?, 'queued', 0, ?)
  `);

  stmt.run(id, repoId, type, now);

  return {
    id,
    repoId,
    type,
    status: "queued",
    error: null,
    progress: 0,
    startedAt: null,
    completedAt: null,
    createdAt: now,
  };
}

export function getJobById(id: string): Job | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs WHERE id = ?");
  const row = stmt.get(id) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function listJobsByRepo(repoId: string): Job[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs WHERE repo_id = ? ORDER BY created_at DESC");
  const rows = stmt.all(repoId) as JobRow[];
  return rows.map(rowToJob);
}

export function getLatestJob(repoId: string, type: JobType): Job | null {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM jobs WHERE repo_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1",
  );
  const row = stmt.get(repoId, type) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function updateJobStatus(
  id: string,
  updates: {
    status?: JobStatus;
    error?: string | null;
    progress?: number;
    startedAt?: string;
    completedAt?: string;
  },
): Job | null {
  const db = getDb();
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (updates.status) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }
  if (updates.error !== undefined) {
    setClauses.push("error = ?");
    params.push(updates.error);
  }
  if (updates.progress !== undefined) {
    setClauses.push("progress = ?");
    params.push(updates.progress);
  }
  if (updates.startedAt) {
    setClauses.push("started_at = ?");
    params.push(updates.startedAt);
  }
  if (updates.completedAt) {
    setClauses.push("completed_at = ?");
    params.push(updates.completedAt);
  }

  if (setClauses.length === 0) return getJobById(id);

  params.push(id);

  const stmt = db.prepare(`UPDATE jobs SET ${setClauses.join(", ")} WHERE id = ?`);
  stmt.run(...params);

  return getJobById(id);
}
