export type ChunkType = "function" | "class" | "interface" | "component" | "api_route";

export interface CodeChunk {
  id: string;
  repoId: string;
  symbolId: string;
  filePath: string;
  content: string;
  chunkType: ChunkType;
  metadata: Record<string, unknown>;
}

export interface EmbeddingRecord {
  id: string;
  repoId: string;
  symbolId: string;
  filePath: string;
  chunkType: ChunkType;
  embedding: number[];
  content: string;
}

export interface EmbeddingSearchResult {
  id: string;
  repoId: string;
  symbolId: string;
  filePath: string;
  chunkType: ChunkType;
  content: string;
  score: number;
}
