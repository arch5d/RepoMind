import path from "node:path";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import { getRepoDir } from "@/lib/github/clone";
import type { SymbolRow } from "@/lib/db/symbols";
import type { DependencyRow } from "@/lib/db/dependencies";
import type { DepNode, DepEdge, DependencyGraph, CycleInfo } from "./trace-types";

const NOISE_TYPES = new Set(["import", "export"]);
const NOISE_RELATIONS = new Set(["exports"]);

interface BuildOptions {
  symbolType?: string;
  scope?: "file" | "module" | "symbol";
  includeNoise?: boolean;
}

function repoRelativePath(filePath: string, repoDir: string): string {
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  const repoNormalized = path.normalize(repoDir).replace(/\\/g, "/");
  if (normalized.startsWith(repoNormalized + "/")) {
    return normalized.slice(repoNormalized.length + 1);
  }
  if (normalized.startsWith(repoNormalized)) {
    return normalized.slice(repoNormalized.length);
  }
  return normalized;
}

function extractModuleFromRelative(relPath: string): string {
  const parts = relPath.replace(/\\/g, "/").split("/");
  for (const part of parts) {
    if (part !== "src" && !part.startsWith(".") && part.length > 0) {
      return part;
    }
  }
  return parts[0] ?? "root";
}

function buildSymbolIndex(symbols: SymbolRow[]): Map<string, SymbolRow> {
  const idx = new Map<string, SymbolRow>();
  for (const s of symbols) idx.set(s.id, s);
  return idx;
}

function buildFileSymbolMap(symbols: SymbolRow[]): Map<string, SymbolRow[]> {
  const map = new Map<string, SymbolRow[]>();
  for (const s of symbols) {
    const list = map.get(s.filePath) ?? [];
    list.push(s);
    map.set(s.filePath, list);
  }
  return map;
}

function buildModuleSymbolMap(
  symbols: SymbolRow[],
  repoDir: string,
): Map<string, SymbolRow[]> {
  const map = new Map<string, SymbolRow[]>();
  for (const s of symbols) {
    const relPath = repoRelativePath(s.filePath, repoDir);
    const mod = extractModuleFromRelative(relPath);
    const list = map.get(mod) ?? [];
    list.push(s);
    map.set(mod, list);
  }
  return map;
}

function buildDependencyGraphFileScope(
  repoId: string,
  symbols: SymbolRow[],
  dependencies: DependencyRow[],
  repoDir: string,
): DependencyGraph {
  const fileSymbols = buildFileSymbolMap(symbols);
  const symbolIdx = buildSymbolIndex(symbols);

  const fileIds = new Map<string, string>();
  const fileNodes: DepNode[] = [];
  let fileCounter = 0;

  for (const [filePath, syms] of fileSymbols) {
    const fid = `file:${filePath}:${fileCounter++}`;
    fileIds.set(filePath, fid);
    const rep = syms.find((s) => s.symbolType !== "import" && s.symbolType !== "export") ?? syms[0]!;
    const relPath = repoRelativePath(filePath, repoDir);
    const mod = extractModuleFromRelative(relPath);
    const fileName = path.basename(relPath);
    fileNodes.push({
      id: fid,
      label: fileName,
      symbolType: "file",
      filePath: relPath,
      exported: syms.some((s) => s.exported),
      lineNumber: 0,
      module: mod,
      depth: 0,
    });
  }

  const seenEdges = new Set<string>();
  const fileEdges: DepEdge[] = [];

  for (const d of dependencies) {
    if (NOISE_RELATIONS.has(d.relationship)) continue;
    if (!d.targetId) continue;

    const srcSym = symbolIdx.get(d.sourceId);
    const tgtSym = symbolIdx.get(d.targetId);
    if (!srcSym || !tgtSym) continue;

    const srcFile = srcSym.filePath;
    const tgtFile = tgtSym.filePath;
    if (srcFile === tgtFile) continue;

    const srcFid = fileIds.get(srcFile);
    const tgtFid = fileIds.get(tgtFile);
    if (!srcFid || !tgtFid) continue;

    const ekey = `${srcFid}->${tgtFid}`;
    if (seenEdges.has(ekey)) continue;
    seenEdges.add(ekey);

    fileEdges.push({
      id: ekey,
      source: srcFid,
      target: tgtFid,
      relationship: d.relationship,
      sourceFile: repoRelativePath(srcFile, repoDir),
      targetFile: repoRelativePath(tgtFile, repoDir),
    });
  }

  const depths = computeDepths(fileNodes, fileEdges);
  for (const n of fileNodes) n.depth = depths.get(n.id) ?? 0;

  return {
    nodes: fileNodes,
    edges: fileEdges,
    totalNodes: fileNodes.length,
    totalEdges: fileEdges.length,
    maxDepth: Math.max(...depths.values(), 0),
    cycleCount: countCycles(fileNodes, fileEdges),
    entryPoints: findEntryPoints(fileNodes, fileEdges),
    nodeBreakdown: { file: fileNodes.length },
    edgeBreakdown: computeEdgeBreakdown(fileEdges),
  };
}

function buildDependencyGraphModuleScope(
  repoId: string,
  symbols: SymbolRow[],
  dependencies: DependencyRow[],
  repoDir: string,
): DependencyGraph {
  const moduleSymbols = buildModuleSymbolMap(symbols, repoDir);
  const symbolIdx = buildSymbolIndex(symbols);

  const moduleIds = new Map<string, string>();
  const modNodes: DepNode[] = [];

  for (const [mod, syms] of moduleSymbols) {
    const mid = `module:${mod}`;
    moduleIds.set(mod, mid);
    const rep = syms[0]!;
    const exportedCount = syms.filter((s) => s.exported).length;
    modNodes.push({
      id: mid,
      label: mod,
      symbolType: "module",
      filePath: repoRelativePath(rep.filePath, repoDir),
      exported: exportedCount > 0,
      lineNumber: 0,
      module: mod,
      depth: 0,
    });
  }

  const seenEdges = new Set<string>();
  const modEdges: DepEdge[] = [];

  for (const d of dependencies) {
    if (NOISE_RELATIONS.has(d.relationship)) continue;
    if (!d.targetId) continue;

    const srcSym = symbolIdx.get(d.sourceId);
    const tgtSym = symbolIdx.get(d.targetId);
    if (!srcSym || !tgtSym) continue;

    const srcMod = extractModuleFromRelative(repoRelativePath(srcSym.filePath, repoDir));
    const tgtMod = extractModuleFromRelative(repoRelativePath(tgtSym.filePath, repoDir));
    if (srcMod === tgtMod) continue;

    const srcMid = moduleIds.get(srcMod);
    const tgtMid = moduleIds.get(tgtMod);
    if (!srcMid || !tgtMid) continue;

    const ekey = `${srcMid}->${tgtMid}`;
    if (seenEdges.has(ekey)) continue;
    seenEdges.add(ekey);

    modEdges.push({
      id: ekey,
      source: srcMid,
      target: tgtMid,
      relationship: "depends_on",
      sourceFile: repoRelativePath(srcSym.filePath, repoDir),
      targetFile: repoRelativePath(tgtSym.filePath, repoDir),
    });
  }

  const depths = computeDepths(modNodes, modEdges);
  for (const n of modNodes) n.depth = depths.get(n.id) ?? 0;

  return {
    nodes: modNodes,
    edges: modEdges,
    totalNodes: modNodes.length,
    totalEdges: modEdges.length,
    maxDepth: Math.max(...depths.values(), 0),
    cycleCount: countCycles(modNodes, modEdges),
    entryPoints: findEntryPoints(modNodes, modEdges),
    nodeBreakdown: { module: modNodes.length },
    edgeBreakdown: { depends_on: modEdges.length },
  };
}

function buildDependencyGraphSymbolScope(
  symbols: SymbolRow[],
  dependencies: DependencyRow[],
  repoDir: string,
): DependencyGraph {
  const symbolIdx = buildSymbolIndex(symbols);

  const nodes: DepNode[] = symbols.map((s) => ({
    id: s.id,
    label: s.name,
    symbolType: s.symbolType,
    filePath: repoRelativePath(s.filePath, repoDir),
    exported: s.exported,
    lineNumber: s.lineNumber,
    module: extractModuleFromRelative(repoRelativePath(s.filePath, repoDir)),
    depth: 0,
  }));

  const edges: DepEdge[] = [];
  for (const d of dependencies) {
    if (NOISE_RELATIONS.has(d.relationship)) continue;
    if (!d.targetId) continue;
    if (!symbolIdx.has(d.sourceId) || !symbolIdx.has(d.targetId)) continue;

    edges.push({
      id: d.id,
      source: d.sourceId,
      target: d.targetId,
      relationship: d.relationship,
      sourceFile: repoRelativePath(d.sourceFile, repoDir),
      targetFile: repoRelativePath(d.targetFile, repoDir),
    });
  }

  const depths = computeDepths(nodes, edges);
  for (const n of nodes) n.depth = depths.get(n.id) ?? 0;

  return {
    nodes,
    edges,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    maxDepth: Math.max(...depths.values(), 0),
    cycleCount: countCycles(nodes, edges),
    entryPoints: findEntryPoints(nodes, edges),
    nodeBreakdown: computeNodeBreakdown(nodes),
    edgeBreakdown: computeEdgeBreakdown(edges),
  };
}

export function buildDependencyGraph(
  repoId: string,
  options?: BuildOptions,
): DependencyGraph {
  const scope = options?.scope ?? "file";
  const includeNoise = options?.includeNoise ?? false;

  const rawSymbols = options?.symbolType
    ? getSymbolsByRepo(repoId, { symbolType: options.symbolType as never })
    : getSymbolsByRepo(repoId);
  const rawDependencies = getDependenciesByRepo(repoId);
  const repoDir = getRepoDir(repoId);

  const filteredSymbols = includeNoise
    ? rawSymbols
    : rawSymbols.filter((s) => !NOISE_TYPES.has(s.symbolType));

  if (scope === "file") {
    return buildDependencyGraphFileScope(repoId, filteredSymbols, rawDependencies, repoDir);
  }

  if (scope === "module") {
    return buildDependencyGraphModuleScope(repoId, filteredSymbols, rawDependencies, repoDir);
  }

  return buildDependencyGraphSymbolScope(filteredSymbols, rawDependencies, repoDir);
}

function computeDepths(nodes: DepNode[], edges: DepEdge[]): Map<string, number> {
  const depths = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  function dfs(id: string, visited: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    let maxChildDepth = 0;
    for (const child of adj.get(id) ?? []) {
      maxChildDepth = Math.max(maxChildDepth, dfs(child, visited));
    }
    visited.delete(id);
    const depth = maxChildDepth + 1;
    depths.set(id, depth);
    return depth;
  }

  for (const n of nodes) {
    if (!depths.has(n.id)) dfs(n.id, new Set());
  }
  return depths;
}

function countCycles(nodes: DepNode[], edges: DepEdge[]): number {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  let cycleCount = 0;
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(id: string): void {
    visited.add(id);
    recStack.add(id);
    for (const nid of adj.get(id) ?? []) {
      if (!visited.has(nid)) dfs(nid);
      else if (recStack.has(nid)) cycleCount++;
    }
    recStack.delete(id);
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) dfs(n.id);
  }
  return cycleCount;
}

function findEntryPoints(nodes: DepNode[], edges: DepEdge[]): DepNode[] {
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (nodes.some((n) => n.id === e.target)) hasIncoming.add(e.target);
  }
  return nodes.filter((n) => !hasIncoming.has(n.id));
}

function computeNodeBreakdown(nodes: DepNode[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const n of nodes) breakdown[n.symbolType] = (breakdown[n.symbolType] ?? 0) + 1;
  return breakdown;
}

function computeEdgeBreakdown(edges: DepEdge[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const e of edges) breakdown[e.relationship] = (breakdown[e.relationship] ?? 0) + 1;
  return breakdown;
}

export function detectCycles(nodes: DepNode[], edges: DepEdge[]): CycleInfo[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const pathStack: string[] = [];

  function dfs(id: string): void {
    visited.add(id);
    recStack.add(id);
    pathStack.push(id);
    for (const nid of adj.get(id) ?? []) {
      if (!visited.has(nid)) dfs(nid);
      else if (recStack.has(nid)) {
        const cycleStart = pathStack.indexOf(nid);
        const cyclePath = pathStack.slice(cycleStart);
        cycles.push({ nodes: cyclePath, path: [...cyclePath, nid] });
      }
    }
    pathStack.pop();
    recStack.delete(id);
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) dfs(n.id);
  }
  return cycles;
}
