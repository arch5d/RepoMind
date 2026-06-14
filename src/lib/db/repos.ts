import { getDb } from "./index";
import { generateId } from "@/lib/utils";
import type { Repository, CloneStatus, ParseStatus, EmbedStatus } from "@/types/repo";

interface RepoRow {
  id: string;
  github_url: string;
  owner: string;
  name: string;
  default_branch: string;
  description: string | null;
  language: string | null;
  stars: number;
  clone_status: string;
  parse_status: string;
  embed_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRepo(row: RepoRow): Repository {
  return {
    id: row.id,
    githubUrl: row.github_url,
    owner: row.owner,
    name: row.name,
    defaultBranch: row.default_branch,
    description: row.description,
    language: row.language,
    stars: row.stars,
    cloneStatus: row.clone_status as CloneStatus,
    parseStatus: row.parse_status as ParseStatus,
    embedStatus: row.embed_status as EmbedStatus,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateRepoInput {
  githubUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  stars: number;
}

export function createRepo(input: CreateRepoInput): Repository {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO repositories (id, github_url, owner, name, default_branch, description, language, stars, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, input.githubUrl, input.owner, input.name, input.defaultBranch, input.description, input.language, input.stars, now, now);

  return rowToRepo({
    id,
    github_url: input.githubUrl,
    owner: input.owner,
    name: input.name,
    default_branch: input.defaultBranch,
    description: input.description,
    language: input.language,
    stars: input.stars,
    clone_status: "pending",
    parse_status: "pending",
    embed_status: "pending",
    last_synced_at: null,
    created_at: now,
    updated_at: now,
  });
}

export function getRepoById(id: string): Repository | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM repositories WHERE id = ?");
  const row = stmt.get(id) as RepoRow | undefined;
  return row ? rowToRepo(row) : null;
}

export function getRepoByUrl(githubUrl: string): Repository | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM repositories WHERE github_url = ?");
  const row = stmt.get(githubUrl) as RepoRow | undefined;
  return row ? rowToRepo(row) : null;
}

export function listRepos(): Repository[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM repositories ORDER BY created_at DESC");
  const rows = stmt.all() as RepoRow[];
  return rows.map(rowToRepo);
}

export function updateRepoStatus(
  id: string,
  updates: {
    cloneStatus?: CloneStatus;
    parseStatus?: ParseStatus;
    embedStatus?: EmbedStatus;
    lastSyncedAt?: string;
    defaultBranch?: string;
    description?: string | null;
    language?: string | null;
    stars?: number;
  },
): Repository | null {
  const db = getDb();
  const now = new Date().toISOString();

  const setClauses: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];

  if (updates.cloneStatus) {
    setClauses.push("clone_status = ?");
    params.push(updates.cloneStatus);
  }
  if (updates.parseStatus) {
    setClauses.push("parse_status = ?");
    params.push(updates.parseStatus);
  }
  if (updates.embedStatus) {
    setClauses.push("embed_status = ?");
    params.push(updates.embedStatus);
  }
  if (updates.lastSyncedAt) {
    setClauses.push("last_synced_at = ?");
    params.push(updates.lastSyncedAt);
  }
  if (updates.defaultBranch) {
    setClauses.push("default_branch = ?");
    params.push(updates.defaultBranch);
  }
  if (updates.description !== undefined) {
    setClauses.push("description = ?");
    params.push(updates.description);
  }
  if (updates.language !== undefined) {
    setClauses.push("language = ?");
    params.push(updates.language);
  }
  if (updates.stars !== undefined) {
    setClauses.push("stars = ?");
    params.push(updates.stars);
  }

  params.push(id);

  const stmt = db.prepare(`UPDATE repositories SET ${setClauses.join(", ")} WHERE id = ?`);
  stmt.run(...params);

  return getRepoById(id);
}

export function deleteRepo(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM repositories WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
