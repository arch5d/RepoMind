import { getDb } from "@/lib/db";
import { createSymbols, deleteSymbolsByRepo } from "@/lib/db/symbols";
import { createDependencies, deleteDependenciesByRepo } from "@/lib/db/dependencies";
import { logger } from "@/lib/logger";
import type { ParseResult } from "./parser-types";

export function storeParseResult(result: ParseResult): void {
  const db = getDb();

  const transaction = db.transaction(() => {
    deleteSymbolsByRepo(result.repoId);
    deleteDependenciesByRepo(result.repoId);

    createSymbols(result.symbols);
    createDependencies(result.dependencies);
  });

  transaction();

  logger.info("parser-store", "Parse result stored", {
    repoId: result.repoId,
    symbols: result.symbols.length,
    dependencies: result.dependencies.length,
  });
}

export { getSymbolById, getSymbolsByRepo, getSymbolCount, getSymbolCountByType, deleteSymbolsByRepo } from "@/lib/db/symbols";
export type { SymbolRow } from "@/lib/db/symbols";

export { getDependenciesByRepo, getDependencyById, getDependencyCount, deleteDependenciesByRepo } from "@/lib/db/dependencies";
export type { DependencyRow } from "@/lib/db/dependencies";
