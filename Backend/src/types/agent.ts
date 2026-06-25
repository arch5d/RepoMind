export type IntentType =
  | "search"
  | "architecture"
  | "documentation"
  | "dependency"
  | "modification_plan";

export type DocType =
  | "readme"
  | "api_doc"
  | "setup_guide"
  | "architecture_doc"
  | "feature_doc";

export type NodeType =
  | "service"
  | "component"
  | "module"
  | "database"
  | "api"
  | "external";

export type Relationship =
  | "imports"
  | "calls"
  | "extends"
  | "implements"
  | "composes"
  | "routes_to";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Source {
  filePath: string;
  symbolName: string;
  symbolType: string;
  relevanceScore: number;
  excerpt: string;
}

export interface AgentState {
  query: string;
  repoId?: string;
  intent?: IntentType;
  messages: Message[];
  subQueries?: string[];
  retrievedChunks?: CodeChunkResult[];
  searchAnswer?: string;
  docType?: DocType;
  documentContent?: string;
  entrySymbol?: string;
  tracePath?: TraceNode[];
  modificationPlan?: ModificationPlan;
  impactedFiles?: string[];
  finalResponse?: string;
  sources?: Source[];
}

export interface CodeChunkResult {
  id: string;
  code: string;
  filePath: string;
  symbolName: string;
  symbolType: string;
  language: string;
  repoId: string;
  score: number;
}

export interface TraceNode {
  symbol: string;
  filePath: string;
  type: string;
  children: TraceNode[];
}

export interface ModificationPlan {
  summary: string;
  files: FileChange[];
  dbChanges: string[];
  implementationStrategy: string;
}

export interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
  reason: string;
}
