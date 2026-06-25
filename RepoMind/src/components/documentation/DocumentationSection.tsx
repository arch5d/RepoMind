"use client";

import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface DocumentationSectionProps {
  title: string;
  content: string;
  level: number;
  defaultOpen?: boolean;
}

export function DocumentationSection({ title, content, level, defaultOpen = true }: DocumentationSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headingSize = level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm";
  const paddingLeft = Math.min((level - 1) * 12, 36);

  return (
    <div style={{ marginLeft: paddingLeft }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent"
      >
        <span className="text-muted-foreground text-xs">{isOpen ? "▼" : "▶"}</span>
        <h3 className={`font-semibold ${headingSize}`}>{title}</h3>
      </button>
      {isOpen && content && (
        <div className="px-4 py-2">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
