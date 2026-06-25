import type { GeneratedDocument, DocSection, DocFormat } from "./document-types";

export interface DocExport {
  format: DocFormat;
  filename: string;
  content: string;
  mimeType: string;
}

export function exportDocument(doc: GeneratedDocument, format: DocFormat): DocExport {
  switch (format) {
    case "markdown":
      return exportMarkdown(doc);
    case "json":
      return exportJson(doc);
  }
}

function exportMarkdown(doc: GeneratedDocument): DocExport {
  const filename = `${doc.docType}-${doc.repoId.slice(0, 8)}.md`;
  return {
    format: "markdown",
    filename,
    content: doc.content,
    mimeType: "text/markdown",
  };
}

function exportJson(doc: GeneratedDocument): DocExport {
  const filename = `${doc.docType}-${doc.repoId.slice(0, 8)}.json`;
  const jsonDoc = {
    title: doc.title,
    docType: doc.docType,
    description: doc.description,
    generatedAt: doc.generatedAt,
    repositoryId: doc.repoId,
    wordCount: doc.wordCount,
    sections: doc.sections.map((s) => ({
      title: s.title,
      level: s.level,
      content: s.content,
    })),
  };

  return {
    format: "json",
    filename,
    content: JSON.stringify(jsonDoc, null, 2),
    mimeType: "application/json",
  };
}

export function buildMarkdownContent(
  title: string,
  sections: DocSection[],
): string {
  const parts: string[] = [];
  parts.push(`# ${title}\n`);

  for (const section of sections) {
    const prefix = "#".repeat(Math.min(section.level + 1, 6));
    parts.push(`\n${prefix} ${section.title}\n`);
    if (section.content) {
      parts.push(`\n${section.content}\n`);
    }
  }

  return parts.join("").trim();
}

export function getFilename(doc: GeneratedDocument, format: DocFormat): string {
  const date = new Date(doc.generatedAt).toISOString().split("T")[0];
  return `${doc.docType}-${date}-${doc.repoId.slice(0, 6)}.${format === "markdown" ? "md" : "json"}`;
}
