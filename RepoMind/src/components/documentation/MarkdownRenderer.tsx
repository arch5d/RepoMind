"use client";

import { Fragment } from "react";

interface MarkdownRendererProps {
  content: string;
}

interface InlineSegment {
  type: "text" | "bold" | "code";
  text: string;
}

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", text: text.slice(last, match.index) });
    }
    const m = match[1]!;
    if (m.startsWith("**")) {
      segments.push({ type: "bold", text: m.slice(2, -2) });
    } else {
      segments.push({ type: "code", text: m.slice(1, -1) });
    }
    last = match.index + m.length;
  }
  if (last < text.length) {
    segments.push({ type: "text", text: text.slice(last) });
  }
  return segments;
}

function renderInline(segments: InlineSegment[]) {
  return segments.map((seg, i) => {
    switch (seg.type) {
      case "bold": return <strong key={i}>{seg.text}</strong>;
      case "code": return <code key={i} style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3, fontSize: "0.85em" }}>{seg.text}</code>;
      default: return <Fragment key={i}>{seg.text}</Fragment>;
    }
  });
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
      {blocks.map((block, i) => {
        const codeMatch = block.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          return (
            <pre key={i} style={{ background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 6, overflow: "auto", fontSize: 12, lineHeight: 1.5, margin: "8px 0" }}>
              <code>{codeMatch[2]!.trim()}</code>
            </pre>
          );
        }
        return (
          <div key={i} style={{ margin: "4px 0" }}>
            {block.split("\n").map((line, j) => {
              if (!line.trim()) return <div key={j} style={{ height: 8 }} />;
              const segments = parseInline(line);
              return <div key={j} style={{ marginBottom: 2 }}>{renderInline(segments)}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}
