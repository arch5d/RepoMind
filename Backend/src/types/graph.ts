export interface GraphNode {
  id: string;
  label: string;
  type: "function" | "class" | "component" | "service" | "module" | "api" | "database";
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationship: "imports" | "calls" | "extends" | "implements" | "composes" | "routes_to";
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MermaidDiagram {
  code: string;
  type: "flowchart" | "classDiagram" | "sequenceDiagram";
}

export interface ReactFlowData {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type?: string;
    filePath?: string;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}
