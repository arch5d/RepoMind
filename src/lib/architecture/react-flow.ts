import type { ArchNode, ArchitectureModel } from "./model-builder";

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    filePath: string;
    module: string;
    exported: boolean;
    lineNumber: number;
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
  api_route: "#3b82f6",
  component: "#8b5cf6",
  service: "#10b981",
  utility: "#f59e0b",
  database: "#ef4444",
  external_dependency: "#6b7280",
};

const LAYER_SPACING_Y = 200;
const NODE_SPACING_X = 200;
const NODE_HEIGHT = 60;
const REMAINING_PER_ROW = 4;

interface LayerLayout {
  name: string;
  nodes: ArchNode[];
}

function layoutLayered(layers: LayerLayout[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx]!;
    if (layer.nodes.length === 0) continue;
    const totalWidth = (layer.nodes.length - 1) * NODE_SPACING_X;
    const startX = -totalWidth / 2;

    for (let nodeIdx = 0; nodeIdx < layer.nodes.length; nodeIdx++) {
      const node = layer.nodes[nodeIdx]!;
      positions.set(node.id, {
        x: startX + nodeIdx * NODE_SPACING_X,
        y: layerIdx * LAYER_SPACING_Y,
      });
    }
  }

  return positions;
}

function normalizePositions(positions: Map<string, { x: number; y: number }>): void {
  if (positions.size === 0) return;
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const pos of positions.values()) {
    if (pos.x < minX) minX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  for (const pos of positions.values()) {
    pos.x -= centerX;
    pos.y -= centerY;
  }
}

export function convertToReactFlow(model: ArchitectureModel): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const layerEntries = model.layers.map((l) => ({
    name: l.name,
    nodes: l.nodes,
  }));

  const positions = layoutLayered(layerEntries);

  const remainingNodes = model.nodes.filter((n) => !positions.has(n.id));

  if (remainingNodes.length > 0) {
    let remainingY = model.layers.length * LAYER_SPACING_Y + 60;
    for (let i = 0; i < remainingNodes.length; i++) {
      const col = i % REMAINING_PER_ROW;
      const row = Math.floor(i / REMAINING_PER_ROW);
      const nodesThisRow = Math.min(remainingNodes.length - row * REMAINING_PER_ROW, REMAINING_PER_ROW);
      const rowWidth = (nodesThisRow - 1) * NODE_SPACING_X;
      const startX = -rowWidth / 2;
      const node = remainingNodes[i]!;
      positions.set(node.id, {
        x: startX + col * NODE_SPACING_X,
        y: remainingY + row * (NODE_HEIGHT + 20),
      });
    }
  }

  normalizePositions(positions);

  const rfNodes: ReactFlowNode[] = model.nodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const color = NODE_COLORS[node.type] ?? "#6b7280";

    return {
      id: node.id,
      type: "architectureNode",
      position: pos,
      data: {
        label: node.label,
        nodeType: node.type,
        filePath: node.filePath,
        module: node.module,
        exported: node.exported,
        lineNumber: node.lineNumber,
      },
      style: {
        borderColor: color,
      },
    };
  });

  const rfEdges: ReactFlowEdge[] = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.type === "imports" ? undefined : edge.type,
    type: "smoothstep",
    animated: edge.type === "calls",
    style: {
      stroke: edge.type === "imports" ? "#94a3b8" : edge.type === "depends_on" ? "#f59e0b" : "#3b82f6",
    },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}
