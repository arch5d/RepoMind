import type { DocSection, DocType } from "./document-types";

export function buildMarkdown(title: string, sections: DocSection[]): string {
  const parts: string[] = [];

  parts.push(`# ${title}\n`);

  for (const section of sections) {
    const prefix = "#".repeat(Math.min(section.level + 1, 6));
    parts.push(`\n${prefix} ${section.title}\n`);
    parts.push(`\n${section.content}\n`);
  }

  return parts.join("").trim();
}

function isUnderline(line: string): boolean {
  return /^[=\-]{3,}$/.test(line.trim());
}

function isBoldLine(line: string): boolean {
  return /^\*\*[^*]+\*\*$/.test(line.trim());
}

export function extractSections(markdown: string): DocSection[] {
  const lines = markdown.split("\n");
  const sections: DocSection[] = [];
  let currentSection: { title: string; level: number; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const nextLine = i + 1 < lines.length ? lines[i + 1]! : "";
    const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (atxMatch) {
      if (currentSection) finalizeSection(currentSection, sections);
      currentSection = { title: atxMatch[2]!, level: atxMatch[1]!.length, content: [] };
    } else if (isUnderline(nextLine) && isBoldLine(line)) {
      if (currentSection) finalizeSection(currentSection, sections);
      currentSection = { title: line.replace(/^\*\*|\*\*$/g, "").trim(), level: nextLine.startsWith("=") ? 1 : 2, content: [] };
      i++;
    } else if (isUnderline(nextLine) && line.trim().length > 0) {
      if (currentSection) finalizeSection(currentSection, sections);
      currentSection = { title: line.trim(), level: nextLine.startsWith("=") ? 1 : 2, content: [] };
      i++;
    } else if (isBoldLine(line)) {
      if (currentSection) finalizeSection(currentSection, sections);
      currentSection = { title: line.replace(/^\*\*|\*\*$/g, "").trim(), level: 2, content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) finalizeSection(currentSection, sections);

  return sections;
}

function finalizeSection(
  current: { title: string; level: number; content: string[] },
  sections: DocSection[],
): void {
  sections.push({
    id: current.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: current.title,
    content: current.content.join("\n").trim(),
    level: current.level,
  });
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function docTypeLabel(docType: DocType): string {
  const labels: Record<DocType, string> = {
    readme: "README",
    api_doc: "API Documentation",
    setup_guide: "Setup Guide",
    architecture_doc: "Architecture Documentation",
    feature_doc: "Feature Documentation",
  };
  return labels[docType];
}
