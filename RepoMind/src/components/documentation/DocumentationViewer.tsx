"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { DocumentationSection } from "./DocumentationSection";
import type { GeneratedDocument } from "@/types/chunk";

interface DocumentationViewerProps {
  document: GeneratedDocument;
}

export function DocumentationViewer({ document: doc }: DocumentationViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const text = doc.sections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n") || doc.content;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [doc]);

  if (doc.sections.length > 0) {
    return (
      <div className="space-y-1">
        <div className="mb-4 border-b pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{doc.title}</h2>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
              title="Copy document"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{doc.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{doc.wordCount.toLocaleString()} words</span>
            <span>{doc.sections.length} sections</span>
            <span>Generated {new Date(doc.generatedAt).toLocaleDateString()}</span>
            <span>Model: {doc.model}</span>
          </div>
        </div>
        {doc.sections.map((section, i) => (
          <DocumentationSection
            key={`${section.id}-${i}`}
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
