import { getSymbolsByRepo } from "@/lib/db/symbols";
import type { DepNode, DepEdge, TracePath, TraceStep, TraceResult } from "./trace-types";
import { buildDependencyGraph, detectCycles } from "./graph-builder";

interface AdjacencyMap {
  forward: Map<string, string[]>;  // source -> [targets]
  backward: Map<string, string[]>; // target -> [sources]
  edgeMap: Map<string, Map<string, DepEdge>>; // source -> (target -> edge)
}

function buildAdjacency(nodes: DepNode[], edges: DepEdge[]): AdjacencyMap {
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  const edgeMap = new Map<string, Map<string, DepEdge>>();

  for (const n of nodes) {
    forward.set(n.id, []);
    backward.set(n.id, []);
    edgeMap.set(n.id, new Map());
  }

  for (const e of edges) {
    const fwd = forward.get(e.source);
    if (fwd) fwd.push(e.target);

    const bwd = backward.get(e.target);
    if (bwd) bwd.push(e.source);

    const srcEdges = edgeMap.get(e.source);
    if (srcEdges) srcEdges.set(e.target, e);
  }

  return { forward, backward, edgeMap };
}

export function traceForward(
  symbolId: string,
  nodes: DepNode[],
  edges: DepEdge[],
  maxDepth: number = 10,
): TracePath {
  const adj = buildAdjacency(nodes, edges);
  const steps: TraceStep[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;

  const symbolNode = nodes.find((n) => n.id === symbolId);
  if (!symbolNode) {
    return { steps, totalSteps: 0, maxDepth: 0, hasCycle: false };
  }

  function dfs(currentId: string, depth: number): void {
    if (depth > maxDepth) return;
    if (visited.has(currentId) && recStack.has(currentId)) {
      hasCycle = true;
      return;
    }
    if (visited.has(currentId)) return;

    visited.add(currentId);
    recStack.add(currentId);

    const currentNode = nodes.find((n) => n.id === currentId);
    const incomingEdge = steps.length > 0 ? adj.edgeMap.get(steps[steps.length - 1]!.symbol)?.get(currentId) : undefined;

    if (currentId !== symbolId || steps.length === 0) {
      steps.push({
        step: steps.length + 1,
        symbol: currentNode?.label ?? currentId,
        file: currentNode?.filePath ?? "",
        type: currentNode?.symbolType ?? "unknown",
        relationship: incomingEdge?.relationship ?? "depends_on",
        depth,
      });
    }

    const targets = adj.forward.get(currentId) ?? [];
    for (const target of targets) {
      dfs(target, depth + 1);
    }

    recStack.delete(currentId);
  }

  dfs(symbolId, 0);

  // Re-sort by depth for a clean chain (topological-like order)
  steps.sort((a, b) => a.depth - b.depth || a.step - b.step);
  const reindexed = steps.map((s, i) => ({ ...s, step: i + 1 }));

  return {
    steps: reindexed,
    totalSteps: reindexed.length,
    maxDepth: Math.max(...reindexed.map((s) => s.depth), 0),
    hasCycle,
  };
}

export function traceBackward(
  symbolId: string,
  nodes: DepNode[],
  edges: DepEdge[],
  maxDepth: number = 10,
): TracePath {
  const adj = buildAdjacency(nodes, edges);
  const steps: TraceStep[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;

  const symbolNode = nodes.find((n) => n.id === symbolId);
  if (!symbolNode) {
    return { steps, totalSteps: 0, maxDepth: 0, hasCycle: false };
  }

  function dfs(currentId: string, depth: number): void {
    if (depth > maxDepth) return;
    if (visited.has(currentId) && recStack.has(currentId)) {
      hasCycle = true;
      return;
    }
    if (visited.has(currentId)) return;

    visited.add(currentId);
    recStack.add(currentId);

    const currentNode = nodes.find((n) => n.id === currentId);
    let incomingRel = "used_by";

    // Find which edge points to the next node in the chain (going backward, we look at what depends on us)
    if (steps.length > 0) {
      const nextId = steps[steps.length - 1]!.symbol;
      const edgesFromCurrent = adj.edgeMap.get(currentId);
      const edge = edgesFromCurrent?.get(nextId);
      if (edge) incomingRel = edge.relationship;
    }

    if (currentId !== symbolId || steps.length === 0) {
      steps.push({
        step: steps.length + 1,
        symbol: currentNode?.label ?? currentId,
        file: currentNode?.filePath ?? "",
        type: currentNode?.symbolType ?? "unknown",
        relationship: incomingRel,
        depth,
      });
    }

    const sources = adj.backward.get(currentId) ?? [];
    for (const source of sources) {
      dfs(source, depth + 1);
    }

    recStack.delete(currentId);
  }

  dfs(symbolId, 0);

  steps.sort((a, b) => a.depth - b.depth || a.step - b.step);
  const reindexed = steps.map((s, i) => ({ ...s, step: i + 1 }));

  return {
    steps: reindexed,
    totalSteps: reindexed.length,
    maxDepth: Math.max(...reindexed.map((s) => s.depth), 0),
    hasCycle,
  };
}

export function traceSymbol(
  repoId: string,
  symbolId: string,
  direction: "forward" | "backward" = "forward",
  maxDepth: number = 10,
): TraceResult {
  const graph = buildDependencyGraph(repoId);
  const cycles = detectCycles(graph.nodes, graph.edges);

  const trace = direction === "forward"
    ? traceForward(symbolId, graph.nodes, graph.edges, maxDepth)
    : traceBackward(symbolId, graph.nodes, graph.edges, maxDepth);

  return { graph, trace, cycles };
}

export function traceByFile(
  repoId: string,
  filePath: string,
  direction: "forward" | "backward" = "forward",
  maxDepth: number = 10,
): TraceResult {
  const symbols = getSymbolsByRepo(repoId);
  const fileSymbols = symbols.filter((s) => s.filePath === filePath);

  if (fileSymbols.length === 0) {
    const graph = buildDependencyGraph(repoId);
    const cycles = detectCycles(graph.nodes, graph.edges);
    return { graph, trace: null, cycles };
  }

  // Trace from the first symbol in the file
  return traceSymbol(repoId, fileSymbols[0]!.id, direction, maxDepth);
}
