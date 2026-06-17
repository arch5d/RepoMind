export type DocType = "readme" | "api_doc" | "setup_guide" | "architecture_doc" | "feature_doc";

export type DocFormat = "markdown" | "json";

export interface DocSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

export interface GeneratedDocument {
  id: string;
  repoId: string;
  docType: DocType;
  title: string;
  description: string;
  sections: DocSection[];
  content: string;
  generatedAt: string;
  wordCount: number;
  model: string;
}

export interface DocumentListItem {
  id: string;
  repoId: string;
  docType: DocType;
  title: string;
  description: string;
  generatedAt: string;
  wordCount: number;
}

export interface DocGenerationRequest {
  docType: DocType;
  customPrompt?: string;
}

export interface DocStatistics {
  totalSections: number;
  wordCount: number;
  generatedAt: string;
  documentType: DocType;
  title: string;
}

export interface DocStoreRecord {
  id: string;
  repo_id: string;
  doc_type: string;
  title: string;
  description: string;
  content: string;
  word_count: number;
  model: string;
  generated_at: string;
  created_at: string;
}
