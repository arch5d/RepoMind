export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface JobResponse {
  jobId: string;
  repoId: string;
}

export interface StatusResponse {
  status: string;
  progress: number;
  error?: string;
}

export interface SearchRequest {
  query: string;
  repoId?: string;
  topK?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResultItem[];
  answer: string;
  sources: SearchSource[];
}

export interface SearchResultItem {
  id: string;
  code: string;
  filePath: string;
  symbolName: string;
  symbolType: string;
  score: number;
}

export interface SearchSource {
  filePath: string;
  symbolName: string;
  excerpt: string;
}

export interface ArchitectureRequest {
  format?: "mermaid" | "react-flow";
}

export interface PlanRequest {
  request: string;
  repoId: string;
}

export interface AgentRequest {
  intent: string;
  query: string;
  repoId?: string;
}

export interface ProviderInfo {
  provider: string;
  model: string;
  embeddingModel: string;
  status: string;
  error?: string;
  latencyMs?: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  checks: {
    chroma: ServiceCheck;
    ai: ServiceCheck;
  };
  provider: ProviderInfo;
}

export interface ServiceCheck {
  status: "ok" | "error";
  error?: string;
  latencyMs?: number;
}
