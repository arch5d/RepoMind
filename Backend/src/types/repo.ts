export type CloneStatus = "pending" | "queued" | "cloning" | "cloned" | "failed";
export type ParseStatus = "pending" | "queued" | "parsing" | "parsed" | "failed";
export type EmbedStatus = "pending" | "queued" | "embedding" | "embedded" | "failed";
export type JobType = "clone" | "parse" | "embed" | "index" | "generate_docs" | "generate_architecture";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface Repository {
  id: string;
  githubUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  stars: number;
  cloneStatus: CloneStatus;
  parseStatus: ParseStatus;
  embedStatus: EmbedStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepoStatus {
  cloneStatus: CloneStatus;
  parseStatus: ParseStatus;
  embedStatus: EmbedStatus;
}

export interface Job {
  id: string;
  repoId: string;
  type: JobType;
  status: JobStatus;
  error: string | null;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateRepoRequest {
  githubUrl: string;
  branch?: string;
}
