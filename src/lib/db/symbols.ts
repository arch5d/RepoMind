import { getDb } from "./index";
import { generateId } from "@/lib/utils";
import type { SymbolType } from "@/lib/parser/parser-types";

export interface SymbolRow {
  id: string;
  repoId: string;
  name: string;
  symbolType: SymbolType;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  exported: boolean;
  sourceCode: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface SymbolDbRow {
  id: string;
  repo_id: string;
  name: string;
  symbol_type: string;
  file_path: string;
  line_number: number;
  column_number: number;
  exported: number;
  source_code: string;
  metadata: string;
  created_at: string;
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function rowToSymbol(row: SymbolDbRow): SymbolRow {
  return {
    id: row.id,
    repoId: row.repo_id,
    name: row.name,
    symbolType: row.symbol_type as SymbolType,
    filePath: row.file_path,
    lineNumber: row.line_number,
    columnNumber: row.column_number,
    exported: row.exported === 1,
    sourceCode: row.source_code,
    metadata: safeJsonParse(row.metadata || "{}"),
    createdAt: row.created_at,
  };
}

export interface CreateSymbolInput {
  id?: string;
  repoId: string;
  name: string;
  symbolType: SymbolType;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  exported: boolean;
  sourceCode: string;
  metadata?: Record<string, unknown>;
}

export function createSymbol(input: CreateSymbolInput): SymbolRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = input.id ?? generateId();

  const stmt = db.prepare(`
    INSERT INTO parsed_symbols (id, repo_id, name, symbol_type, file_path, line_number, column_number, exported, source_code, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.repoId,
    input.name,
    input.symbolType,
    input.filePath,
    input.lineNumber,
    input.columnNumber,
    input.exported ? 1 : 0,
    input.sourceCode,
    JSON.stringify(input.metadata ?? {}),
    now,
  );

  return {
    id,
    repoId: input.repoId,
    name: input.name,
    symbolType: input.symbolType,
    filePath: input.filePath,
    lineNumber: input.lineNumber,
    columnNumber: input.columnNumber,
    exported: input.exported,
    sourceCode: input.sourceCode,
    metadata: input.metadata ?? {},
    createdAt: now,
  };
}

export function createSymbols(inputs: CreateSymbolInput[]): void {
  if (inputs.length === 0) return;

  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO parsed_symbols (id, repo_id, name, symbol_type, file_path, line_number, column_number, exported, source_code, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const input of inputs) {
    const id = input.id ?? generateId();
    stmt.run(
      id,
      input.repoId,
      input.name,
      input.symbolType,
      input.filePath,
      input.lineNumber,
      input.columnNumber,
      input.exported ? 1 : 0,
      input.sourceCode,
      JSON.stringify(input.metadata ?? {}),
      now,
    );
  }
}

export function upsertSymbol(input: CreateSymbolInput): SymbolRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = input.id ?? generateId();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO parsed_symbols (id, repo_id, name, symbol_type, file_path, line_number, column_number, exported, source_code, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.repoId,
    input.name,
    input.symbolType,
    input.filePath,
    input.lineNumber,
    input.columnNumber,
    input.exported ? 1 : 0,
    input.sourceCode,
    JSON.stringify(input.metadata ?? {}),
    now,
  );

  return {
    id,
    repoId: input.repoId,
    name: input.name,
    symbolType: input.symbolType,
    filePath: input.filePath,
    lineNumber: input.lineNumber,
    columnNumber: input.columnNumber,
    exported: input.exported,
    sourceCode: input.sourceCode,
    metadata: input.metadata ?? {},
    createdAt: now,
  };
}

export function getSymbolById(id: string): SymbolRow | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM parsed_symbols WHERE id = ?");
  const row = stmt.get(id) as SymbolDbRow | undefined;
  return row ? rowToSymbol(row) : null;
}

export function getSymbolsByRepo(
  repoId: string,
  options?: { symbolType?: SymbolType; offset?: number; limit?: number },
): SymbolRow[] {
  const db = getDb();
  const conditions = ["repo_id = ?"];
  const params: unknown[] = [repoId];

  if (options?.symbolType) {
    conditions.push("symbol_type = ?");
    params.push(options.symbolType);
  }

  let sql = `SELECT * FROM parsed_symbols WHERE ${conditions.join(" AND ")} ORDER BY file_path, line_number`;

  const hasLimit = options?.limit !== undefined;
  const hasOffset = options?.offset !== undefined;

  if (hasLimit) {
    sql += " LIMIT ?";
    params.push(options.limit!);
  } else if (hasOffset) {
    sql += " LIMIT -1";
  }

  if (hasOffset) {
    sql += " OFFSET ?";
    params.push(options.offset!);
  }

  const rows = db.prepare(sql).all(...params) as SymbolDbRow[];
  return rows.map(rowToSymbol);
}

export function deleteSymbolsByRepo(repoId: string): number {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM parsed_symbols WHERE repo_id = ?");
  const result = stmt.run(repoId);
  return result.changes;
}

export function getSymbolCount(repoId: string, symbolType?: SymbolType): number {
  const db = getDb();
  const params: unknown[] = [repoId];
  let sql = "SELECT COUNT(*) as count FROM parsed_symbols WHERE repo_id = ?";
  if (symbolType) {
    sql += " AND symbol_type = ?";
    params.push(symbolType);
  }
  const row = db.prepare(sql).get(...params) as { count: number };
  return row.count;
}

export function getSymbolCountByType(repoId: string): Array<{ symbolType: string; count: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT symbol_type, COUNT(*) as count FROM parsed_symbols WHERE repo_id = ? GROUP BY symbol_type ORDER BY count DESC",
    )
    .all(repoId) as Array<{ symbol_type: string; count: number }>;
  return rows.map((r) => ({ symbolType: r.symbol_type, count: r.count }));
}
