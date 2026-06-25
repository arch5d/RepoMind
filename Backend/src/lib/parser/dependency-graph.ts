import path from "node:path";
import type { SourceFile } from "ts-morph";
import { generateId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { ParsedSymbol, Dependency } from "./parser-types";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];

function resolveModulePath(
  moduleSpecifier: string,
  sourceFilePath: string,
  sourceFiles: Map<string, SourceFile>,
): string | null {
  if (!moduleSpecifier.startsWith(".") && !moduleSpecifier.startsWith("/")) {
    return null;
  }

  const sourceDir = path.dirname(sourceFilePath);
  const resolved = path.resolve(sourceDir, moduleSpecifier);
  const normalized = path.normalize(resolved).replace(/\\/g, "/");

  const candidates: string[] = [];

  for (const ext of EXTENSIONS) {
    candidates.push(`${normalized}${ext}`);
    candidates.push(`${normalized}/index${ext}`);
  }

  for (const candidate of candidates) {
    if (sourceFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getSymbolsByFile(
  symbols: ParsedSymbol[],
): Map<string, ParsedSymbol[]> {
  const map = new Map<string, ParsedSymbol[]>();
  for (const sym of symbols) {
    const existing = map.get(sym.filePath) ?? [];
    existing.push(sym);
    map.set(sym.filePath, existing);
  }
  return map;
}

export function buildDependencyGraph(
  repoId: string,
  symbols: ParsedSymbol[],
  sourceFiles: SourceFile[],
): Dependency[] {
  const dependencies: Dependency[] = [];
  const seen = new Set<string>();

  const fileMap = new Map<string, SourceFile>();
  for (const sf of sourceFiles) {
    const normalized = path.normalize(sf.getFilePath()).replace(/\\/g, "/");
    fileMap.set(normalized, sf);
  }

  const symbolsByFile = getSymbolsByFile(symbols);
  const importSymbols = symbols.filter((s) => s.symbolType === "import");

  for (const imp of importSymbols) {
    const moduleSpecifier = imp.metadata.moduleSpecifier as string;
    if (!moduleSpecifier) continue;

    const targetFile = resolveModulePath(moduleSpecifier, imp.filePath, fileMap);
    if (!targetFile) continue;

    const key = `imports:${imp.filePath}:${targetFile}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const targetSymbols = symbolsByFile.get(targetFile) ?? [];
    const targetName = targetSymbols.length > 0
      ? targetSymbols[0]!.name
      : path.basename(targetFile, path.extname(targetFile));

    const dependency: Dependency = {
      id: generateId(),
      repoId,
      sourceId: imp.id,
      targetId: targetSymbols[0]?.id ?? null,
      sourceSymbol: imp.name,
      targetSymbol: targetName,
      sourceFile: imp.filePath,
      targetFile,
      relationship: "imports",
    };

    dependencies.push(dependency);
  }

  const classSymbols = symbols.filter((s) => s.symbolType === "class");
  for (const cls of classSymbols) {
    const heritage = cls.metadata.heritage as Record<string, string[]> | undefined;
    if (!heritage) continue;

    if (heritage.extends) {
      for (const parentName of heritage.extends) {
        const key = `extends:${cls.id}:${parentName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const parentSymbols = symbols.filter(
          (s) => s.name === parentName && (s.symbolType === "class" || s.symbolType === "interface"),
        );

        dependencies.push({
          id: generateId(),
          repoId,
          sourceId: cls.id,
          targetId: parentSymbols[0]?.id ?? null,
          sourceSymbol: cls.name,
          targetSymbol: parentName,
          sourceFile: cls.filePath,
          targetFile: parentSymbols[0]?.filePath ?? cls.filePath,
          relationship: "extends",
        });
      }
    }

    if (heritage.implements) {
      for (const ifaceName of heritage.implements) {
        const key = `implements:${cls.id}:${ifaceName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const targetSymbols = symbols.filter(
          (s) => s.name === ifaceName && (s.symbolType === "interface" || s.symbolType === "class"),
        );

        dependencies.push({
          id: generateId(),
          repoId,
          sourceId: cls.id,
          targetId: targetSymbols[0]?.id ?? null,
          sourceSymbol: cls.name,
          targetSymbol: ifaceName,
          sourceFile: cls.filePath,
          targetFile: targetSymbols[0]?.filePath ?? cls.filePath,
          relationship: "implements",
        });
      }
    }
  }

  for (const exp of symbols.filter((s) => s.symbolType === "export")) {
    const moduleSpecifier = exp.metadata.moduleSpecifier as string | undefined;
    if (!moduleSpecifier || moduleSpecifier === null) continue;

    const targetFile = resolveModulePath(moduleSpecifier, exp.filePath, fileMap);
    if (!targetFile) continue;

    const key = `exports:${exp.filePath}:${targetFile}`;
    if (seen.has(key)) continue;
    seen.add(key);

    dependencies.push({
      id: generateId(),
      repoId,
      sourceId: exp.id,
      targetId: null,
      sourceSymbol: exp.name,
      targetSymbol: path.basename(targetFile, path.extname(targetFile)),
      sourceFile: exp.filePath,
      targetFile,
      relationship: "exports",
    });
  }

  logger.info("dependency-graph", "Dependency graph built", {
    dependencies: dependencies.length,
    repoId,
  });

  return dependencies;
}
