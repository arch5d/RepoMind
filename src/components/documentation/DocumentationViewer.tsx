"use client";

import { DocumentationSection } from "./DocumentationSection";
import type { GeneratedDocument } from "@/lib/documentation/document-types";

interface DocumentationViewerProps {
  document: GeneratedDocument;
}

export function DocumentationViewer({ document: doc }: DocumentationViewerProps) {
  if (doc.sections.length > 0) {
    return (
      <div className="space-y-1">
        <div className="mb-4 border-b pb-3">
          <h2 className="text-xl font-bold">{doc.title}</h2>
          <p className="text-sm text-muted-foreground">{doc.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{doc.wordCount.toLocaleString()} words</span>
            <span>{doc.sections.length} sections</span>
            <span>Generated {new Date(doc.generatedAt).toLocaleDateString()}</span>
            <span>Model: {doc.model}</span>
          </div>
        </div>
        {doc.sections.map((section) => (
          <DocumentationSection
            key={section.id}
            title={section.title}
            content={section.content}
            level={section.level}
            defaultOpen={true}
          />
        ))}
      </div>
    );
  }

  // Fallback: render raw markdown as sections
  const lines = doc.content.split("\n");
  const sections: { title: string; level: number; content: string[] }[] = [];
  let current: { title: string; level: number; content: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[2]!, level: headingMatch[1]!.length, content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);

  return (
    <div className="space-y-1">
      {sections.map((s, i) => (
        <DocumentationSection
          key={i}
          title={s.title}
          content={s.content.join("\n").trim()}
          level={s.level}
          defaultOpen={true}
        />
      ))}
    </div>
  );
}
