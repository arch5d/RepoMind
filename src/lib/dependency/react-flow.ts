import type { DepNode, DependencyGraph } from "./trace-types";

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    symbolType: string;
    filePath: string;
    exported: boolean;
    depth: number;
  };
  style?: Record<string, string>;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "default" | "smoothstep" | "step";
  animated?: boolean;
  style?: Record<string, string>;
}

const NODE_COLORS: Record<string, string> = {
  function: "#3b82f6",
  class: "#8b5cf6",
  interface: "#10b981",
  component: "#f59e0b",
  api_route: "#ef4444",
  type: "#6b7280",
  import: "#94a3b8",
  export: "#94a3b8",
};

const EDGE_COLORS: Record<string, string> = {
  imports: "#94a3b8",
  extends: "#f59e0b",
  implements: "#10b981",
  composes: "#3b82f6",
  exports: "#6b7280",
};

const SPACING_X = 200;
const SPACING_Y = 100;

export function convertDependencyGraph(graph: DependencyGraph): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const nodesByDepth = new Map<number, DepNode[]>();
  for (const node of graph.nodes) {
    const list = nodesByDepth.get(node.depth) ?? [];
    list.push(node);
    nodesByDepth.set(node.depth, list);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [depth, nodesAtDepth] of nodesByDepth) {
    const count = nodesAtDepth.length;
    const totalWidth = (count - 1) * SPACING_X;
    const startX = -totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const node = nodesAtDepth[i]!;
      positions.set(node.id, {
        x: startX + i * SPACING_X,
        y: depth * (SPACING_Y + 80),
      });
    }
  }

  const rfNodes: ReactFlowNode[] = graph.nodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const color = NODE_COLORS[node.symbolType] ?? "#6b7280";

    return {
      id: node.id,
      type: "dependencyNode",
      position: pos,
      data: {
        label: node.label,
        symbolType: node.symbolType,
        filePath: node.filePath,
        exported: node.exported,
        depth: node.depth,
      },
      style: { borderColor: color },
    };
  });

  const rfEdges: ReactFlowEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.relationship === "imports" ? undefined : edge.relationship,
    type: "smoothstep",
    animated: edge.relationship === "calls",
    style: {
      stroke: EDGE_COLORS[edge.relationship] ?? "#94a3b8",
    },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}
