export interface DepNode {
  id: string;
  label: string;
  symbolType: string;
  filePath: string;
  exported: boolean;
  lineNumber: number;
  depth: number;
}

export interface DepEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  sourceFile: string;
  targetFile: string;
}

export interface TraceStep {
  step: number;
  symbol: string;
  file: string;
  type: string;
  relationship: string;
  depth: number;
}

export interface TracePath {
  steps: TraceStep[];
  totalSteps: number;
  maxDepth: number;
  hasCycle: boolean;
}

export interface DependencyGraph {
  nodes: DepNode[];
  edges: DepEdge[];
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  cycleCount: number;
  entryPoints: DepNode[];
  nodeBreakdown: Record<string, number>;
  edgeBreakdown: Record<string, number>;
}

export interface CycleInfo {
  nodes: string[];
  path: string[];
}

export interface TraceResult {
  graph: DependencyGraph;
  trace: TracePath | null;
  cycles: CycleInfo[];
}
