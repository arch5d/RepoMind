export type SymbolType =
  | "function"
  | "class"
  | "interface"
  | "component"
  | "api_route"
  | "module"
  | "import";

export interface ChunkMetadata {
  filePath: string;
  symbolName: string;
  symbolType: SymbolType;
  language: string;
  repoId: string;
  startLine: number;
  endLine: number;
  dependencies: string[];
}

export interface CodeChunk {
  id?: string;
  code: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface DependencyEdge {
  sourceId: string;
  sourceSymbol: string;
  sourceFile: string;
  targetId: string;
  targetSymbol: string;
  targetFile: string;
  relationship: string;
  repoId: string;
}

export interface ArchNode {
  id: string;
  label: string;
  nodeType: string;
  description: string;
  repoId: string;
  parentId?: string;
  connections?: ArchEdge[];
}

export interface ArchEdge {
  source: string;
  target: string;
  label?: string;
}

export interface DocNode {
  id: string;
  docType: string;
  content: string;
  repoId: string;
  generatedAt: string;
  model: string;
}

export interface GeneratedDocument {
  id: string;
  repoId: string;
  docType: string;
  title: string;
  description: string;
  sections: DocSection[];
  content: string;
  generatedAt: string;
  wordCount: number;
  model: string;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  level: number;
}
