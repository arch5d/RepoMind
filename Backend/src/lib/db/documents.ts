import { getDb } from "./index";
import type { DocStoreRecord, GeneratedDocument, DocumentListItem, DocType } from "@/lib/documentation/document-types";

function rowToDocument(row: DocStoreRecord): GeneratedDocument {
  const parsed = JSON.parse(row.content);
  return {
    id: row.id,
    repoId: row.repo_id,
    docType: row.doc_type as DocType,
    title: row.title,
    description: row.description,
    sections: parsed.sections ?? [],
    content: parsed.markdown ?? row.content,
    generatedAt: row.generated_at,
    wordCount: row.word_count,
    model: row.model,
  };
}

export function getDocumentsByRepo(repoId: string, docType?: DocType): DocumentListItem[] {
  const db = getDb();
  const conditions = ["repo_id = ?"];
  const params: unknown[] = [repoId];

  if (docType) {
    conditions.push("doc_type = ?");
    params.push(docType);
  }

  const rows = db
    .prepare(`SELECT id, repo_id, doc_type, title, description, word_count, generated_at FROM documents WHERE ${conditions.join(" AND ")} ORDER BY generated_at DESC`)
    .all(...params) as Array<{
      id: string; repo_id: string; doc_type: string; title: string;
      description: string; word_count: number; generated_at: string;
    }>;

  return rows.map((r) => ({
    id: r.id,
    repoId: r.repo_id,
    docType: r.doc_type as DocType,
    title: r.title,
    description: r.description,
    generatedAt: r.generated_at,
    wordCount: r.word_count,
  }));
}

export function getDocumentById(id: string): GeneratedDocument | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocStoreRecord | undefined;
  if (!row) return null;
  return rowToDocument(row);
}

export function getDocumentByRepoAndType(repoId: string, docType: DocType): GeneratedDocument | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM documents WHERE repo_id = ? AND doc_type = ? ORDER BY generated_at DESC LIMIT 1")
    .get(repoId, docType) as DocStoreRecord | undefined;
  if (!row) return null;
  return rowToDocument(row);
}

export function saveDocument(doc: GeneratedDocument): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO documents (id, repo_id, doc_type, title, description, content, word_count, model, generated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc.id,
    doc.repoId,
    doc.docType,
    doc.title,
    doc.description,
    JSON.stringify({ markdown: doc.content, sections: doc.sections }),
    doc.wordCount,
    doc.model,
    doc.generatedAt,
    now,
  );
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getDocumentCount(repoId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM documents WHERE repo_id = ?").get(repoId) as { count: number };
  return row.count;
}
