"use client";

import * as React from "react";
import { Search, Loader2, FileCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface SearchResult {
  filePath: string;
  symbolName: string;
  symbolType: string;
  excerpt: string;
  score: number;
}

interface SearchResponse {
  answer: string;
  sources: SearchResult[];
  agentMessages: string[];
}

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.success) setResults(data.data);
      else setError(data.error ?? "Search failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Semantic Search</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Ask a question about your codebase..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Answer</CardTitle></CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {results.answer}
              </div>
            </CardContent>
          </Card>

          {results.sources.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Sources ({results.sources.length})</h2>
              {results.sources.map((source, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{source.filePath}</span>
                        <Badge variant="secondary" className="text-[10px]">{source.symbolType}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(source.score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">
                      <code>{source.excerpt}</code>
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
