import { logger } from "@/lib/logger";
import { discoverSourceFiles } from "./file-discovery";
import { createProject } from "./project-loader";
import { extractSymbols } from "./symbol-extractor";
import { buildDependencyGraph } from "./dependency-graph";
import type { ParserConfig, ParseResult } from "./parser-types";

export async function parseRepository(config: ParserConfig): Promise<ParseResult> {
  const startTime = Date.now();
  const { repoId, repoDir, onProgress } = config;

  logger.info("parser", "Starting repository parse", { repoId, repoDir });

  onProgress?.(0.1);

  const discovery = discoverSourceFiles(repoDir, config.ignorePatterns);

  onProgress?.(0.25);

  if (discovery.files.length === 0) {
    logger.warn("parser", "No source files found to parse", { repoId });
    return {
      repoId,
      symbols: [],
      dependencies: [],
      filesParsed: 0,
      filesTotal: 0,
      durationMs: Date.now() - startTime,
    };
  }

  const { project, fileCount } = createProject(discovery.files, repoDir);

  onProgress?.(0.35);

  const sourceFiles = project.getSourceFiles();

  const symbols = extractSymbols(repoId, sourceFiles);

  onProgress?.(0.5);

  const dependencies = buildDependencyGraph(repoId, symbols, sourceFiles);

  onProgress?.(0.75);

  const durationMs = Date.now() - startTime;

  logger.info("parser", "Parse completed", {
    repoId,
    filesParsed: fileCount,
    filesTotal: discovery.files.length,
    symbols: symbols.length,
    dependencies: dependencies.length,
    durationMs,
  });

  return {
    repoId,
    symbols,
    dependencies,
    filesParsed: fileCount,
    filesTotal: discovery.files.length,
    durationMs,
  };
}
