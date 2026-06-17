export type IntentType = "search" | "architecture" | "dependency_trace" | "documentation";

export interface Source {
  filePath: string;
  symbolName: string;
  symbolType: string;
  excerpt: string;
  score: number;
}

export interface AgentInput {
  query: string;
  repoId: string;
}

export interface AgentOutput {
  answer: string;
  sources: Source[];
  intent: IntentType;
}

export interface AgentState {
  query: string;
  repoId: string;
  intent: IntentType | null;
  searchResults: Source[];
  context: string;
  answer: string;
  sources: Source[];
  error: string | null;
  agentMessages: string[];
}
