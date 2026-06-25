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
    depth?: number;
  };
  style?: Record<string, string | number>;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "default" | "smoothstep" | "step";
  animated?: boolean;
  style?: Record<string, string | number>;
}

const NODE_COLORS: Record<string, string> = {
  api_route: "#3b82f6",
  component: "#8b5cf6",
  service: "#10b981",
  utility: "#f59e0b",
  database: "#ef4444",
  external_dependency: "#6b7280",
};

const NODE_W = 160;
const NODE_H = 50;
const LAYER_GAP_Y = 100;
const SIBLING_GAP_X = 12;

type AdjList = Map<string, string[]>;

function buildAdjacency(nodes: ArchNode[], edges: { source: string; target: string }[]): {
  forward: AdjList;
  backward: AdjList;
} {
  const forward: AdjList = new Map();
  const backward: AdjList = new Map();
  for (const n of nodes) {
    forward.set(n.id, []);
    backward.set(n.id, []);
  }
  for (const e of edges) {
    forward.get(e.source)?.push(e.target);
    backward.get(e.target)?.push(e.source);
  }
  return { forward, backward };
}

/**
 * Assign each node a depth (layer) using longest-path layering.
 * Entry points (no incoming edges) get depth 0.
 * Each node's depth = max(parent depths) + 1.
 */
function assignDepths(
  nodes: ArchNode[],
  backward: AdjList,
): Map<string, number> {
  const depth = new Map<string, number>();

  function compute(id: string, visited: Set<string>): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const parents = backward.get(id) ?? [];
    let maxParentDepth = -1;
    for (const p of parents) {
      maxParentDepth = Math.max(maxParentDepth, compute(p, visited));
    }
    const d = maxParentDepth + 1;
    depth.set(id, d);
    return d;
  }

  for (const n of nodes) {
    if (!depth.has(n.id)) {
      compute(n.id, new Set());
    }
  }
  return depth;
}

/**
 * Layout nodes in a tree by depth:
 * - Each depth = one horizontal row
 * - Within a row, sort children under their parent's X position
 */
function layoutTree(
  nodes: ArchNode[],
  forward: AdjList,
  backward: AdjList,
  depths: Map<string, number>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group nodes by depth
  const byDepth = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depths.get(n.id) ?? 0;
    const list = byDepth.get(d) ?? [];
    list.push(n.id);
    byDepth.set(d, list);
  }

  // Find entry points (depth 0 or no incoming)
  const entryPoints = nodes
    .filter((n) => (depths.get(n.id) ?? 0) === 0)
    .map((n) => n.id);

  // Layout depth by depth, positioning children under parents
  const nodeOrder: string[] = [];

  // Depth 0: center entry points
  const depth0 = entryPoints.length > 0 ? entryPoints : (byDepth.get(0) ?? []);
  const d0Width = (depth0.length - 1) * (NODE_W + SIBLING_GAP_X);
  const d0StartX = -d0Width / 2;
  for (let i = 0; i < depth0.length; i++) {
    positions.set(depth0[i]!, {
      x: d0StartX + i * (NODE_W + SIBLING_GAP_X),
      y: 0,
    });
    nodeOrder.push(depth0[i]!);
  }

  // For each subsequent depth, place children under their parents
  const maxDepth = Math.max(...Array.from(depths.values()), 0);
  for (let d = 1; d <= maxDepth; d++) {
    const levelNodes = byDepth.get(d) ?? [];
    if (levelNodes.length === 0) continue;

    // For each node at this depth, find its parents from previous depth
    // Position it under the average X of its parents
    const positioned: { id: string; x: number }[] = [];

    for (const nid of levelNodes) {
      const parents = backward.get(nid) ?? [];
      const parentPositions = parents
        .map((pid) => positions.get(pid))
        .filter((p): p is { x: number; y: number } => p !== undefined);

      let x: number;
      if (parentPositions.length > 0) {
        x = parentPositions.reduce((sum, p) => sum + p.x, 0) / parentPositions.length;
      } else {
        // No parent positioned yet, use existing depth-0 sibling average
        const existingLevel = positioned;
        if (existingLevel.length > 0) {
          x = existingLevel.reduce((sum, p) => sum + p.x, 0) / existingLevel.length;
        } else {
          x = 0;
        }
      }

      positioned.push({ id: nid, x });
      nodeOrder.push(nid);
    }

    // Sort positioned nodes by X then spread them to avoid overlap
    positioned.sort((a, b) => a.x - b.x);

    // Spread to minimum gap
    const minGap = NODE_W + SIBLING_GAP_X;
    for (let i = 1; i < positioned.length; i++) {
      const prev = positioned[i - 1]!;
      const curr = positioned[i]!;
      if (curr.x - prev.x < minGap) {
        curr.x = prev.x + minGap;
      }
    }

    // Center the row
    if (positioned.length > 0) {
      const firstX = positioned[0]!.x;
      const lastX = positioned[positioned.length - 1]!.x;
      const rowWidth = lastX - firstX;
      const shift = -rowWidth / 2 - firstX;
      for (const p of positioned) {
        p.x += shift;
      }
    }

    for (const p of positioned) {
      positions.set(p.id, { x: p.x, y: d * LAYER_GAP_Y });
    }
  }

  // Handle any unpositioned nodes
  for (const n of nodes) {
    if (!positions.has(n.id)) {
      positions.set(n.id, { x: 0, y: maxDepth * LAYER_GAP_Y + LAYER_GAP_Y });
    }
  }

  return positions;
}

function centerPositions(positions: Map<string, { x: number; y: number }>): void {
  if (positions.size === 0) return;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const pos of positions.values()) {
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (const pos of positions.values()) {
    pos.x -= cx;
    pos.y -= cy - 40;
  }
}

export function convertToReactFlow(model: ArchitectureModel): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const edgePairs = model.edges.map((e) => ({ source: e.source, target: e.target }));
  const adj = buildAdjacency(model.nodes, edgePairs);

  const depths = assignDepths(model.nodes, adj.backward);
  const positions = layoutTree(model.nodes, adj.forward, adj.backward, depths);
  centerPositions(positions);

  const rfNodes: ReactFlowNode[] = model.nodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const color = NODE_COLORS[node.type] ?? "#6b7280";
    const d = depths.get(node.id) ?? 0;

    return {
      id: node.id,
      type: "architectureNode",
      position: { x: pos.x, y: pos.y },
      data: {
        label: node.label,
        nodeType: node.type,
        filePath: node.filePath,
        module: node.module,
        exported: node.exported,
        lineNumber: node.lineNumber,
        depth: d,
      },
      style: {
        borderColor: color,
        width: `${NODE_W}px`,
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
