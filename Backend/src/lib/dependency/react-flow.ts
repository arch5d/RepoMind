import type { DepNode, DependencyGraph } from "./trace-types";

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    symbolType: string;
    filePath: string;
    module: string;
    exported: boolean;
    depth: number;
  };
  style?: Record<string, string>;
  parentId?: string;
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
  module: "#06b6d4",
};

const EDGE_COLORS: Record<string, string> = {
  imports: "#94a3b8",
  extends: "#f59e0b",
  implements: "#10b981",
  composes: "#3b82f6",
  depends_on: "#06b6d4",
};

const SPACING_X = 250;
const SPACING_Y = 120;
const MODULE_PADDING_X = 40;
const MODULE_PADDING_Y = 60;

interface DagreNode {
  id: string;
  width: number;
  height: number;
}

interface DagreEdge {
  v: string;
  w: string;
}

function toposort(nodes: DagreNode[], edges: DagreEdge[]): string[] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    const list = adj.get(e.v);
    if (list) list.push(e.w);
    inDegree.set(e.w, (inDegree.get(e.w) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const neighbor of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  const zeroDeg = Array.from(inDegree.entries())
    .filter(([_, d]) => d === 0)
    .map(([id]) => id);

  return order.length === nodes.length ? order : zeroDeg;
}

function computeHierarchicalLayout(
  nodes: DepNode[],
  edges: { source: string; target: string }[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const dagNodes: DagreNode[] = nodes.map((n) => ({
    id: n.id,
    width: 160,
    height: 50,
  }));

  const dagEdges: DagreEdge[] = edges.map((e) => ({
    v: e.source,
    w: e.target,
  }));

  const order = toposort(dagNodes, dagEdges);

  const rankMap = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  function assignRank(id: string, visited: Set<string>): number {
    if (rankMap.has(id)) return rankMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const children = adj.get(id) ?? [];
    let maxRank = -1;
    for (const child of children) {
      maxRank = Math.max(maxRank, assignRank(child, visited));
    }
    const rank = maxRank + 1;
    rankMap.set(id, rank);
    return rank;
  }

  for (const id of order) {
    assignRank(id, new Set());
  }

  const nodesByRank = new Map<number, string[]>();
  for (const n of nodes) {
    const rank = rankMap.get(n.id) ?? 0;
    const list = nodesByRank.get(rank) ?? [];
    list.push(n.id);
    nodesByRank.set(rank, list);
  }

  for (const [rank, ids] of nodesByRank) {
    const count = ids.length;
    const totalWidth = (count - 1) * SPACING_X;
    const startX = -totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const id = ids[i]!;
      const nodeWidth = 160;
      positions.set(id, {
        x: startX + i * SPACING_X + nodeWidth / 2,
        y: rank * (SPACING_Y + 50),
      });
    }
  }

  return positions;
}

function groupByModule(nodes: DepNode[]): Map<string, DepNode[]> {
  const groups = new Map<string, DepNode[]>();
  for (const node of nodes) {
    const list = groups.get(node.module) ?? [];
    list.push(node);
    groups.set(node.module, list);
  }
  return groups;
}

export function convertDependencyGraph(
  graph: DependencyGraph,
  scope: "file" | "module" | "symbol" = "file",
): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const positions = computeHierarchicalLayout(graph.nodes, graph.edges);

  if (scope === "file" || scope === "symbol") {
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
          module: node.module,
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
      label: edge.relationship === "imports" || edge.relationship === "depends_on"
        ? undefined
        : edge.relationship,
      type: "smoothstep",
      animated: edge.relationship === "depends_on",
      style: {
        stroke: EDGE_COLORS[edge.relationship] ?? "#94a3b8",
      },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }

  const moduleGroups = groupByModule(graph.nodes);
  const modulePositions = new Map<string, { x: number; y: number }>();
  const moduleIndex = Array.from(moduleGroups.keys());
  const moduleWidth = 160;
  const moduleHeight = 50;
  const totalModWidth = (moduleIndex.length - 1) * SPACING_X;
  const modStartX = -totalModWidth / 2;

  for (let i = 0; i < moduleIndex.length; i++) {
    modulePositions.set(moduleIndex[i]!, {
      x: modStartX + i * SPACING_X + moduleWidth / 2,
      y: 0,
    });
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
        module: node.module,
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
    label: edge.relationship === "imports" || edge.relationship === "depends_on"
      ? undefined
      : edge.relationship,
    type: "smoothstep",
    animated: edge.relationship === "depends_on",
    style: {
      stroke: EDGE_COLORS[edge.relationship] ?? "#94a3b8",
    },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}
