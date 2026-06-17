import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import type { SymbolRow } from "@/lib/db/symbols";
import type { DepNode, DepEdge, DependencyGraph, CycleInfo } from "./trace-types";

function buildNodeMap(symbols: SymbolRow[]): Map<string, SymbolRow> {
  const map = new Map<string, SymbolRow>();
  for (const s of symbols) map.set(s.id, s);
  return map;
}

export function buildDependencyGraph(
  repoId: string,
  options?: { symbolType?: string },
): DependencyGraph {
  const symbols = options?.symbolType
    ? getSymbolsByRepo(repoId, { symbolType: options.symbolType as never })
    : getSymbolsByRepo(repoId);
  const dependencies = getDependenciesByRepo(repoId);
  const symbolMap = buildNodeMap(symbols);

  const nodes: DepNode[] = symbols.map((s) => ({
    id: s.id,
    label: s.name,
    symbolType: s.symbolType,
    filePath: s.filePath,
    exported: s.exported,
    lineNumber: s.lineNumber,
    depth: 0,
  }));

  const edges: DepEdge[] = [];
  for (const d of dependencies) {
    if (!d.targetId) continue;
    if (!symbolMap.has(d.sourceId) || !symbolMap.has(d.targetId)) continue;

    edges.push({
      id: d.id,
      source: d.sourceId,
      target: d.targetId,
      relationship: d.relationship,
      sourceFile: d.sourceFile,
      targetFile: d.targetFile,
    });
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const depths = computeDepths(nodes, edges);
  for (const [id, depth] of depths) {
    const node = nodeMap.get(id);
    if (node) node.depth = depth;
  }

  const cycleCount = countCycles(nodes, edges);
  const entryPoints = findEntryPoints(nodes, edges);
  const nodeBreakdown = computeNodeBreakdown(nodes);
  const edgeBreakdown = computeEdgeBreakdown(edges);

  return {
    nodes,
    edges,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    maxDepth: Math.max(...depths.values(), 0),
    cycleCount,
    entryPoints,
    nodeBreakdown,
    edgeBreakdown,
  };
}

function computeDepths(nodes: DepNode[], edges: DepEdge[]): Map<string, number> {
  const depths = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  function dfs(id: string, visited: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visited.has(id)) return 0;

    visited.add(id);
    const children = adj.get(id) ?? [];
    let maxChildDepth = 0;
    for (const child of children) {
      maxChildDepth = Math.max(maxChildDepth, dfs(child, visited));
    }
    visited.delete(id);

    const depth = maxChildDepth + 1;
    depths.set(id, depth);
    return depth;
  }

  for (const n of nodes) {
    if (!depths.has(n.id)) {
      dfs(n.id, new Set());
    }
  }

  return depths;
}

function countCycles(nodes: DepNode[], edges: DepEdge[]): number {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  let cycleCount = 0;
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(id: string): void {
    visited.add(id);
    recStack.add(id);

    const neighbors = adj.get(id) ?? [];
    for (const nid of neighbors) {
      if (!visited.has(nid)) {
        dfs(nid);
      } else if (recStack.has(nid)) {
        cycleCount++;
      }
    }

    recStack.delete(id);
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      dfs(n.id);
    }
  }

  return cycleCount;
}

function findEntryPoints(nodes: DepNode[], edges: DepEdge[]): DepNode[] {
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (nodes.some((n) => n.id === e.target)) {
      hasIncoming.add(e.target);
    }
  }
  return nodes.filter((n) => !hasIncoming.has(n.id));
}

function computeNodeBreakdown(nodes: DepNode[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const n of nodes) {
    breakdown[n.symbolType] = (breakdown[n.symbolType] ?? 0) + 1;
  }
  return breakdown;
}

function computeEdgeBreakdown(edges: DepEdge[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const e of edges) {
    breakdown[e.relationship] = (breakdown[e.relationship] ?? 0) + 1;
  }
  return breakdown;
}

export function detectCycles(nodes: DepNode[], edges: DepEdge[]): CycleInfo[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const pathStack: string[] = [];

  function dfs(id: string): void {
    visited.add(id);
    recStack.add(id);
    pathStack.push(id);

    const neighbors = adj.get(id) ?? [];
    for (const nid of neighbors) {
      if (!visited.has(nid)) {
        dfs(nid);
      } else if (recStack.has(nid)) {
        const cycleStart = pathStack.indexOf(nid);
        const cyclePath = pathStack.slice(cycleStart);
        cycles.push({
          nodes: cyclePath,
          path: [...cyclePath, nid],
        });
      }
    }

    pathStack.pop();
    recStack.delete(id);
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      dfs(n.id);
    }
  }

  return cycles;
}
