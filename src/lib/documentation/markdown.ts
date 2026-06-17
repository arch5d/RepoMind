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

export function extractSections(markdown: string): DocSection[] {
  const lines = markdown.split("\n");
  const sections: DocSection[] = [];
  let currentSection: { title: string; level: number; content: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection) {
        sections.push({
          id: currentSection.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title: currentSection.title,
          content: currentSection.content.join("\n").trim(),
          level: currentSection.level,
        });
      }
      currentSection = {
        title: headingMatch[2]!,
        level: headingMatch[1]!.length,
        content: [],
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      id: currentSection.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: currentSection.title,
      content: currentSection.content.join("\n").trim(),
      level: currentSection.level,
    });
  }

  return sections;
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
