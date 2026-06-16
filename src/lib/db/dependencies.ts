import { getDb } from "./index";
import { generateId } from "@/lib/utils";
import type { Relationship } from "@/lib/parser/parser-types";

export interface DependencyRow {
  id: string;
  repoId: string;
  sourceId: string;
  targetId: string | null;
  sourceSymbol: string;
  targetSymbol: string;
  sourceFile: string;
  targetFile: string;
  relationship: Relationship;
  createdAt: string;
}

interface DependencyDbRow {
  id: string;
  repo_id: string;
  source_id: string;
  target_id: string | null;
  source_symbol: string;
  target_symbol: string;
  source_file: string;
  target_file: string;
  relationship: string;
  created_at: string;
}

function rowToDependency(row: DependencyDbRow): DependencyRow {
  return {
    id: row.id,
    repoId: row.repo_id,
    sourceId: row.source_id,
    targetId: row.target_id ?? null,
    sourceSymbol: row.source_symbol,
    targetSymbol: row.target_symbol,
    sourceFile: row.source_file,
    targetFile: row.target_file,
    relationship: row.relationship as Relationship,
    createdAt: row.created_at,
  };
}

export interface CreateDependencyInput {
  id?: string;
  repoId: string;
  sourceId: string;
  targetId?: string | null;
  sourceSymbol: string;
  targetSymbol: string;
  sourceFile: string;
  targetFile: string;
  relationship: Relationship;
}

export function createDependency(input: CreateDependencyInput): DependencyRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = input.id ?? generateId();

  const stmt = db.prepare(`
    INSERT INTO dependencies (id, repo_id, source_id, target_id, source_symbol, target_symbol, source_file, target_file, relationship, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.repoId,
    input.sourceId,
    input.targetId ?? null,
    input.sourceSymbol,
    input.targetSymbol,
    input.sourceFile,
    input.targetFile,
    input.relationship,
    now,
  );

  return {
    id,
    repoId: input.repoId,
    sourceId: input.sourceId,
    targetId: input.targetId ?? null,
    sourceSymbol: input.sourceSymbol,
    targetSymbol: input.targetSymbol,
    sourceFile: input.sourceFile,
    targetFile: input.targetFile,
    relationship: input.relationship,
    createdAt: now,
  };
}

export function createDependencies(inputs: CreateDependencyInput[]): void {
  if (inputs.length === 0) return;

  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO dependencies (id, repo_id, source_id, target_id, source_symbol, target_symbol, source_file, target_file, relationship, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const input of inputs) {
    const id = input.id ?? generateId();
    stmt.run(
      id,
      input.repoId,
      input.sourceId,
      input.targetId ?? null,
      input.sourceSymbol,
      input.targetSymbol,
      input.sourceFile,
      input.targetFile,
      input.relationship,
      now,
    );
  }
}

export function getDependenciesByRepo(
  repoId: string,
  options?: { relationship?: Relationship; offset?: number; limit?: number },
): DependencyRow[] {
  const db = getDb();
  const conditions = ["repo_id = ?"];
  const params: unknown[] = [repoId];

  if (options?.relationship) {
    conditions.push("relationship = ?");
    params.push(options.relationship);
  }

  let sql = `SELECT * FROM dependencies WHERE ${conditions.join(" AND ")} ORDER BY source_file`;

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

  const rows = db.prepare(sql).all(...params) as DependencyDbRow[];
  return rows.map(rowToDependency);
}

export function getDependencyById(id: string): DependencyRow | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM dependencies WHERE id = ?");
  const row = stmt.get(id) as DependencyDbRow | undefined;
  return row ? rowToDependency(row) : null;
}

export function deleteDependenciesByRepo(repoId: string): number {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM dependencies WHERE repo_id = ?");
  const result = stmt.run(repoId);
  return result.changes;
}

export function getDependencyCount(repoId: string, relationship?: Relationship): number {
  const db = getDb();
  const params: unknown[] = [repoId];
  let sql = "SELECT COUNT(*) as count FROM dependencies WHERE repo_id = ?";
  if (relationship) {
    sql += " AND relationship = ?";
    params.push(relationship);
  }
  const row = db.prepare(sql).get(...params) as { count: number };
  return row.count;
}
