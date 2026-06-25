import path from "node:path";
import type { SymbolRow } from "@/lib/db/symbols";
import type { DependencyRow } from "@/lib/db/dependencies";

export type ArchNodeType =
  | "api_route"
  | "component"
  | "service"
  | "utility"
  | "database"
  | "external_dependency";

export type ArchEdgeType =
  | "imports"
  | "calls"
  | "depends_on"
  | "uses";

export type ArchitectureType =
  | "monolith"
  | "layered"
  | "microservice"
  | "frontend-only"
  | "backend-only"
  | "full-stack";

export interface ArchNode {
  id: string;
  label: string;
  type: ArchNodeType;
  filePath: string;
  module: string;
  exported: boolean;
  lineNumber: number;
  sourceCode?: string;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  type: ArchEdgeType;
  label?: string;
}

export interface ModuleGroup {
  name: string;
  path: string;
  nodes: ArchNode[];
  description: string;
}

export interface ServiceBoundary {
  name: string;
  type: string;
  filePaths: string[];
  primaryType: ArchNodeType;
}

export interface ArchitectureModel {
  nodes: ArchNode[];
  edges: ArchEdge[];
  modules: ModuleGroup[];
  services: ServiceBoundary[];
  entryPoints: ArchNode[];
  apiRoutes: ArchNode[];
  architectureType: ArchitectureType;
  layers: { name: string; nodes: ArchNode[] }[];
}

const ENTRY_POINT_NAMES = new Set(["page.tsx", "layout.tsx", "route.ts", "main.ts", "index.ts"]);
const API_DIR_PATTERN = /[/\\]api[/\\]/;
const SERVICE_INDICATORS = ["service", "services", "provider", "providers"];
const DATA_INDICATORS = ["data", "db", "database", "repository", "repositories", "model", "models"];

function inferNodeType(symbol: SymbolRow): ArchNodeType {
  if (symbol.symbolType === "api_route") return "api_route";
  if (symbol.symbolType === "component") return "component";
  if (symbol.symbolType === "class") {
    const fileLower = symbol.filePath.toLowerCase();
    const nameLower = symbol.name.toLowerCase();
    if (nameLower.includes("chroma") || nameLower.includes("vectorstore") || nameLower.includes("vectordb")) return "database";
    if (nameLower.includes("openai") || nameLower.includes("ollama") || nameLower.includes("nvidia") || nameLower.includes("nim")) return "external_dependency";
    if (nameLower.includes("github") || nameLower.includes("octokit")) return "external_dependency";
    if (fileLower.includes("chroma") || fileLower.includes("vector")) return "database";
    if (fileLower.includes("service") || fileLower.includes("handler") || fileLower.includes("manager")) return "service";
    if (fileLower.includes("db") || fileLower.includes("database") || fileLower.includes("repository") || fileLower.includes("model") || fileLower.includes("data")) return "database";
    return "service";
  }
  if (symbol.symbolType === "interface") return "service";
  const nameLower = symbol.name.toLowerCase();
  if (nameLower.startsWith("openai") || nameLower.startsWith("ollama") || nameLower.startsWith("chroma")) return "external_dependency";
  return "utility";
}

function extractModule(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const srcIndex = parts.indexOf("src");
  if (srcIndex >= 0 && srcIndex < parts.length - 1) {
    return parts[srcIndex + 1] ?? "root";
  }
  if (parts.length >= 2) {
    return parts[0] ?? "root";
  }
  return "root";
}

export function detectArchitectureType(
  symbols: SymbolRow[],
  modules: ModuleGroup[],
): ArchitectureType {
  let hasApiRoutes = false;
  let hasComponents = false;
  let serviceCount = 0;
  let moduleCount = modules.length;

  for (const sym of symbols) {
    if (sym.symbolType === "api_route") hasApiRoutes = true;
    if (sym.symbolType === "component") hasComponents = true;
    if (sym.symbolType === "class") {
      const fl = sym.filePath.toLowerCase();
      if (fl.includes("service")) serviceCount++;
    }
  }

  if (hasApiRoutes && hasComponents) return "full-stack";
  if (hasApiRoutes && !hasComponents) return "backend-only";
  if (!hasApiRoutes && hasComponents) return "frontend-only";

  if (serviceCount > 3 && moduleCount > 3) return "microservice";
  if (moduleCount >= 2) return "layered";
  return "monolith";
}

function inferEdgeType(dep: DependencyRow): ArchEdgeType {
  switch (dep.relationship) {
    case "imports": return "imports";
    case "extends": return "depends_on";
    case "implements": return "depends_on";
    case "composes": return "uses";
    case "exports": return "uses";
    default: return "imports";
  }
}

function buildSymbolMap(symbols: SymbolRow[]): Map<string, SymbolRow> {
  const map = new Map<string, SymbolRow>();
  for (const s of symbols) map.set(s.id, s);
  return map;
}

export function buildArchitectureModel(
  _repoId: string,
  symbols: SymbolRow[],
  dependencies: DependencyRow[],
): ArchitectureModel {
  const symbolMap = buildSymbolMap(symbols);
  const nodes: ArchNode[] = [];
  const nodesByFile: Map<string, ArchNode[]> = new Map();

  for (const sym of symbols) {
    const node: ArchNode = {
      id: sym.id,
      label: sym.name,
      type: inferNodeType(sym),
      filePath: sym.filePath,
      module: extractModule(sym.filePath),
      exported: sym.exported,
      lineNumber: sym.lineNumber,
      sourceCode: sym.sourceCode,
    };
    nodes.push(node);
    const existing = nodesByFile.get(sym.filePath) ?? [];
    existing.push(node);
    nodesByFile.set(sym.filePath, existing);
  }

  const edges: ArchEdge[] = [];

  for (const dep of dependencies) {
    if (!dep.targetId) continue;
    if (!symbolMap.has(dep.sourceId) || !symbolMap.has(dep.targetId)) continue;

    edges.push({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId,
      type: inferEdgeType(dep),
      label: dep.relationship,
    });
  }

  const moduleMap = new Map<string, ArchNode[]>();
  for (const node of nodes) {
    const existing = moduleMap.get(node.module) ?? [];
    existing.push(node);
    moduleMap.set(node.module, existing);
  }

  const modules: ModuleGroup[] = [];
  for (const [name, modNodes] of moduleMap) {
    modules.push({
      name: name || "root",
      path: name,
      nodes: modNodes,
      description: `${modNodes.length} symbols across ${new Set(modNodes.map(n => n.filePath)).size} files`,
    });
  }

  modules.sort((a, b) => b.nodes.length - a.nodes.length);

  const services: ServiceBoundary[] = [];
  for (const mod of modules) {
    const primaryType = inferPrimaryType(mod.nodes);
    services.push({
      name: mod.name,
      type: primaryType,
      filePaths: [...new Set(mod.nodes.map(n => n.filePath))],
      primaryType,
    });
  }

  const entryPoints = nodes.filter((n) => {
    const fileName = path.basename(n.filePath).toLowerCase();
    return ENTRY_POINT_NAMES.has(fileName);
  });

  const apiRoutes = nodes.filter((n) => n.type === "api_route" || API_DIR_PATTERN.test(n.filePath));

  const layers: { name: string; nodes: ArchNode[] }[] = [];
  const apiNodes = nodes.filter(n => API_DIR_PATTERN.test(n.filePath));
  const serviceNodes = nodes.filter(n => SERVICE_INDICATORS.some(i => n.filePath.toLowerCase().includes(i)));
  const dataNodes = nodes.filter(n => DATA_INDICATORS.some(i => n.filePath.toLowerCase().includes(i)));
  const componentNodes = nodes.filter(n => n.type === "component");
  const utilityNodes = nodes.filter(n => n.type === "utility" && !apiNodes.includes(n) && !serviceNodes.includes(n));

  if (apiNodes.length > 0) layers.push({ name: "API Layer", nodes: apiNodes });
  if (serviceNodes.length > 0) layers.push({ name: "Service Layer", nodes: serviceNodes });
  if (dataNodes.length > 0) layers.push({ name: "Data Layer", nodes: dataNodes });
  if (componentNodes.length > 0) layers.push({ name: "UI Layer", nodes: componentNodes });
  if (utilityNodes.length > 0) layers.push({ name: "Utilities", nodes: utilityNodes });

  const architectureType = detectArchitectureType(symbols, modules);

  return {
    nodes,
    edges,
    modules,
    services,
    entryPoints,
    apiRoutes,
    architectureType,
    layers,
  };
}

function inferPrimaryType(nodes: ArchNode[]): ArchNodeType {
  const counts: Partial<Record<ArchNodeType, number>> = {};
  for (const n of nodes) {
    counts[n.type] = (counts[n.type] ?? 0) + 1;
  }
  let best: ArchNodeType = "utility";
  let bestCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = type as ArchNodeType;
    }
  }
  return best;
}
