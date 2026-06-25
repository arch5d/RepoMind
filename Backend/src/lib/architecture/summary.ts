import path from "node:path";
import { getRepoById } from "@/lib/db/repos";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import type { Repository } from "@/types/repo";
import type { SymbolRow } from "@/lib/db/symbols";
import type { DependencyRow } from "@/lib/db/dependencies";

const ENTRY_POINT_NAMES = new Set([
  "page.tsx",
  "layout.tsx",
  "route.ts",
  "main.ts",
  "index.ts",
]);

export interface SymbolBreakdown {
  functions: number;
  classes: number;
  interfaces: number;
  components: number;
  apiRoutes: number;
}

export interface DependencyBreakdown {
  imports: number;
  exports: number;
  extends: number;
  implements: number;
}

export interface Overview {
  totalSymbols: number;
  totalDependencies: number;
  totalFiles: number;
}

export interface ArchitectureSummary {
  repository: Repository;
  overview: Overview;
  symbolBreakdown: SymbolBreakdown;
  dependencyBreakdown: DependencyBreakdown;
  entryPoints: SymbolRow[];
  apiRoutes: SymbolRow[];
  topComponents: SymbolRow[];
}

function computeSymbolBreakdown(symbols: SymbolRow[]): SymbolBreakdown {
  const counts = { functions: 0, classes: 0, interfaces: 0, components: 0, apiRoutes: 0 };

  for (const sym of symbols) {
    switch (sym.symbolType) {
      case "function":
        counts.functions++;
        break;
      case "class":
        counts.classes++;
        break;
      case "interface":
        counts.interfaces++;
        break;
      case "component":
        counts.components++;
        break;
      case "api_route":
        counts.apiRoutes++;
        break;
    }
  }

  return counts;
}

function computeDependencyBreakdown(dependencies: DependencyRow[]): DependencyBreakdown {
  const counts = { imports: 0, exports: 0, extends: 0, implements: 0 };

  for (const dep of dependencies) {
    switch (dep.relationship) {
      case "imports":
        counts.imports++;
        break;
      case "exports":
        counts.exports++;
        break;
      case "extends":
        counts.extends++;
        break;
      case "implements":
        counts.implements++;
        break;
    }
  }

  return counts;
}

function countUniqueFiles(symbols: SymbolRow[]): number {
  const seen = new Set<string>();
  for (const sym of symbols) {
    seen.add(sym.filePath);
  }
  return seen.size;
}

function detectEntryPoints(symbols: SymbolRow[]): SymbolRow[] {
  return symbols.filter((sym) => {
    const filePath = sym.filePath.toLowerCase();
    const fileName = path.basename(filePath);
    return ENTRY_POINT_NAMES.has(fileName);
  });
}

function detectApiRoutes(symbols: SymbolRow[]): SymbolRow[] {
  return symbols.filter((sym) => sym.symbolType === "api_route");
}

function detectTopComponents(symbols: SymbolRow[]): SymbolRow[] {
  return symbols.filter(
    (sym) => sym.symbolType === "component" && sym.exported,
  );
}

export function computeArchitectureSummary(repoId: string): ArchitectureSummary {
  const repository = getRepoById(repoId);
  if (!repository) {
    throw new Error(`Repository with id '${repoId}' not found`);
  }

  const allSymbols = getSymbolsByRepo(repoId);
  const allDependencies = getDependenciesByRepo(repoId);
  const totalSymbols = allSymbols.length;
  const totalDependencies = allDependencies.length;
  const totalFiles = countUniqueFiles(allSymbols);

  const symbolBreakdown = computeSymbolBreakdown(allSymbols);
  const dependencyBreakdown = computeDependencyBreakdown(allDependencies);
  const entryPoints = detectEntryPoints(allSymbols);
  const apiRoutes = detectApiRoutes(allSymbols);
  const topComponents = detectTopComponents(allSymbols);

  return {
    repository,
    overview: {
      totalSymbols,
      totalDependencies,
      totalFiles,
    },
    symbolBreakdown,
    dependencyBreakdown,
    entryPoints,
    apiRoutes,
    topComponents,
  };
}
