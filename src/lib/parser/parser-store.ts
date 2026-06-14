import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ParseResult } from "./parser-types";

export function storeParseResult(result: ParseResult): void {
  const db = getDb();

  const insertSymbol = db.prepare(`
    INSERT OR REPLACE INTO parsed_symbols
      (id, repo_id, name, symbol_type, file_path, line_number, column_number, exported, source_code, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDep = db.prepare(`
    INSERT OR REPLACE INTO dependencies
      (id, repo_id, source_id, target_id, source_symbol, target_symbol, source_file, target_file, relationship, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteOldSymbols = db.prepare("DELETE FROM parsed_symbols WHERE repo_id = ?");
  const deleteOldDeps = db.prepare("DELETE FROM dependencies WHERE repo_id = ?");

  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    deleteOldSymbols.run(result.repoId);
    deleteOldDeps.run(result.repoId);

    for (const sym of result.symbols) {
      insertSymbol.run(
        sym.id,
        sym.repoId,
        sym.name,
        sym.symbolType,
        sym.filePath,
        sym.lineNumber,
        sym.columnNumber,
        sym.exported ? 1 : 0,
        sym.sourceCode,
        JSON.stringify(sym.metadata),
        now,
      );
    }

    for (const dep of result.dependencies) {
      insertDep.run(
        dep.id,
        dep.repoId,
        dep.sourceId,
        dep.targetId,
        dep.sourceSymbol,
        dep.targetSymbol,
        dep.sourceFile,
        dep.targetFile,
        dep.relationship,
        now,
      );
    }
  });

  transaction();

  logger.info("parser-store", "Parse result stored", {
    repoId: result.repoId,
    symbols: result.symbols.length,
    dependencies: result.dependencies.length,
  });
}

export interface StoredSymbol {
  id: string;
  repoId: string;
  name: string;
  symbolType: string;
  filePath: string;
  lineNumber: number;
  exported: boolean;
  sourceCode: string;
  metadata: Record<string, unknown>;
}

export interface StoredDependency {
  id: string;
  repoId: string;
  sourceId: string;
  targetId: string | null;
  sourceSymbol: string;
  targetSymbol: string;
  sourceFile: string;
  targetFile: string;
  relationship: string;
}

export function getStoredSymbols(repoId: string): StoredSymbol[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM parsed_symbols WHERE repo_id = ? ORDER BY file_path, line_number")
    .all(repoId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: row.id as string,
    repoId: row.repo_id as string,
    name: row.name as string,
    symbolType: row.symbol_type as string,
    filePath: row.file_path as string,
    lineNumber: row.line_number as number,
    exported: (row.exported as number) === 1,
    sourceCode: row.source_code as string,
    metadata: JSON.parse((row.metadata as string) || "{}") as Record<string, unknown>,
  }));
}

export function getStoredDependencies(repoId: string): StoredDependency[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM dependencies WHERE repo_id = ?")
    .all(repoId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: row.id as string,
    repoId: row.repo_id as string,
    sourceId: row.source_id as string,
    targetId: (row.target_id as string) ?? null,
    sourceSymbol: row.source_symbol as string,
    targetSymbol: row.target_symbol as string,
    sourceFile: row.source_file as string,
    targetFile: row.target_file as string,
    relationship: row.relationship as string,
  }));
}

export function getSymbolCount(repoId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM parsed_symbols WHERE repo_id = ?")
    .get(repoId) as { count: number };
  return row.count;
}
