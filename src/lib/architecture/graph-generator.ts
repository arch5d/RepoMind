import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import { buildArchitectureModel } from "./model-builder";
import type { ArchitectureModel, ArchNode, ArchEdge } from "./model-builder";

export interface NormalizedGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
  totalNodes: number;
  totalEdges: number;
  uniqueModules: string[];
  uniqueFiles: string[];
}

function deduplicateNodes(nodes: ArchNode[]): ArchNode[] {
  const seen = new Map<string, ArchNode>();
  for (const node of nodes) {
    const key = `${node.filePath}:${node.label}`;
    if (!seen.has(key)) {
      seen.set(key, node);
    }
  }
  return Array.from(seen.values());
}

function collectUniqueModules(nodes: ArchNode[]): string[] {
  return [...new Set(nodes.map((n) => n.module))].sort();
}

function collectUniqueFiles(nodes: ArchNode[]): string[] {
  return [...new Set(nodes.map((n) => n.filePath))].sort();
}

export function buildNormalizedGraph(repoId: string): NormalizedGraph {
  const symbols = getSymbolsByRepo(repoId);
  const dependencies = getDependenciesByRepo(repoId);

  const model = buildArchitectureModel(repoId, symbols, dependencies);
  const dedupedNodes = deduplicateNodes(model.nodes);

  return {
    nodes: dedupedNodes,
    edges: model.edges,
    totalNodes: dedupedNodes.length,
    totalEdges: model.edges.length,
    uniqueModules: collectUniqueModules(dedupedNodes),
    uniqueFiles: collectUniqueFiles(dedupedNodes),
  };
}

export interface ArchitectureGraphResult {
  model: ArchitectureModel;
  graph: NormalizedGraph;
  statistics: {
    totalFiles: number;
    totalSymbols: number;
    totalModules: number;
    totalDependencies: number;
    totalEdges: number;
    architectureType: string;
    nodeBreakdown: Record<string, number>;
    edgeBreakdown: Record<string, number>;
  };
}

export function computeArchitectureGraph(repoId: string): ArchitectureGraphResult {
  const symbols = getSymbolsByRepo(repoId);
  const dependencies = getDependenciesByRepo(repoId);

  const model = buildArchitectureModel(repoId, symbols, dependencies);
  const graph = buildNormalizedGraph(repoId);

  const nodeBreakdown: Record<string, number> = {};
  for (const n of model.nodes) {
    nodeBreakdown[n.type] = (nodeBreakdown[n.type] ?? 0) + 1;
  }

  const edgeBreakdown: Record<string, number> = {};
  for (const e of model.edges) {
    edgeBreakdown[e.type] = (edgeBreakdown[e.type] ?? 0) + 1;
  }

  const uniqueFiles = new Set(model.nodes.map((n) => n.filePath));

  return {
    model,
    graph,
    statistics: {
      totalFiles: uniqueFiles.size,
      totalSymbols: model.nodes.length,
      totalModules: model.modules.length,
      totalDependencies: dependencies.length,
      totalEdges: model.edges.length,
      architectureType: model.architectureType,
      nodeBreakdown,
      edgeBreakdown,
    },
  };
}
