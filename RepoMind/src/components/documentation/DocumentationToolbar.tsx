"use client";

import { useState } from "react";

interface DocumentationToolbarProps {
  docId: string;
  content: string;
  docType: string;
  repoId: string;
  onRegenerate: () => void;
  generating: boolean;
}

export function DocumentationToolbar({
  docId,
  content,
  docType,
  repoId,
  onRegenerate,
  generating,
}: DocumentationToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${repoId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    window.open(`/api/repos/${repoId}/documentation/download?id=${docId}&format=json`, "_blank");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <span className="text-xs font-medium uppercase text-muted-foreground mr-2">
        {docType.replace("_", " ")}
      </span>

      <div className="flex-1" />

      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>

      <button
        onClick={handleDownloadMarkdown}
        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Download .md
      </button>

      <button
        onClick={handleDownloadJson}
        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Download .json
      </button>

      <button
        onClick={onRegenerate}
        disabled={generating}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {generating ? "Generating..." : "Regenerate"}
      </button>
    </div>
  );
}
