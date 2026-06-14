import { logger } from "@/lib/logger";
import { discoverSourceFiles } from "./file-discovery";
import { createProject } from "./project-loader";
import { extractSymbols } from "./symbol-extractor";
import { buildDependencyGraph } from "./dependency-graph";
import type { ParserConfig, ParseResult } from "./parser-types";

export async function parseRepository(config: ParserConfig): Promise<ParseResult> {
  const startTime = Date.now();
  const { repoId, repoDir } = config;

  logger.info("parser", "Starting repository parse", { repoId, repoDir });

  const discovery = discoverSourceFiles(repoDir, config.ignorePatterns);

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

  const sourceFiles = project.getSourceFiles();

  const symbols = extractSymbols(repoId, sourceFiles);

  const dependencies = buildDependencyGraph(repoId, symbols, sourceFiles);

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
