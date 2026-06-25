"use client";

import * as React from "react";
import { Brain, GitBranch, Search, FileText, Workflow, GitFork, Pencil, BookOpen, Activity, ArrowRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { RepoStatusBadge } from "@/components/repo/repo-status-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FeatureItem {
  title: string;
  description: string;
  icon: typeof GitBranch;
  status: string;
  href?: string;
  requiresRepo?: boolean;
  disabled?: boolean;
}

const FEATURES: FeatureItem[] = [
  { title: "Repository Ingestion", description: "Clone and analyze GitHub repositories with automatic metadata extraction.", icon: GitBranch, status: "live", href: "/repos/new" },
  { title: "Semantic Code Search", description: "Ask questions about code and get context-aware answers with source citations.", icon: Search, status: "live", href: "/search" },
  { title: "Architecture Generation", description: "Auto-generate component diagrams, service maps, and data flow visualizations.", icon: Workflow, status: "live", requiresRepo: true },
  { title: "Dependency Tracing", description: "Trace execution flow across API routes, services, repositories, and databases.", icon: GitFork, status: "live", requiresRepo: true },
  { title: "Auto Documentation", description: "Generate README, API docs, setup guides, and architecture documentation.", icon: FileText, status: "live", requiresRepo: true },
  { title: "Modification Planner", description: "Plan code changes with intelligent impact analysis and implementation strategy.", icon: Pencil, status: "planned", disabled: true },
];

interface DashboardStats {
  repos: number;
  cloned: number;
  parsed: number;
  embedded: number;
  symbols: number;
  dependencies: number;
  documents: number;
  recentRepos: { id: string; owner: string; name: string; language: string | null; cloneStatus: string }[];
  recentDocs: { id: string; docType: string; title: string; repoId: string }[];
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  function loadStats() {
    setLoading(true);
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { loadStats(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">AI-powered repository intelligence platform overview.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-2"><GitBranch className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-7 w-12" /> : stats?.repos ?? 0}</p>
              <p className="text-xs text-muted-foreground">Repositories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-2"><Activity className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-7 w-12" /> : stats?.parsed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Parsed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-2"><Search className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-7 w-12" /> : stats?.symbols ?? 0}</p>
              <p className="text-xs text-muted-foreground">Symbols</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-2"><FileText className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{loading ? <Skeleton className="h-7 w-12" /> : stats?.documents ?? 0}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Repositories</CardTitle>
              <Link href="/repos" className="text-xs text-primary hover:underline inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : stats?.recentRepos?.length ? (
              stats.recentRepos.map((r) => (
                <Link key={r.id} href={`/repos/${r.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{r.owner}/{r.name}</span>
                    {r.language && <span className="text-xs text-muted-foreground">{r.language}</span>}
                  </div>
                  <RepoStatusBadge status={r.cloneStatus as never} />
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">No repositories yet. <Link href="/repos/new" className="text-primary hover:underline">Add one.</Link></p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Documents</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : stats?.recentDocs?.length ? (
              stats.recentDocs.map((d) => (
                <Link key={d.id} href={`/repos/${d.repoId}/docs`} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium flex-1 truncate">{d.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{d.docType}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">No documents generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Features</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const href = feature.requiresRepo ? (stats?.recentRepos?.[0] ? `/repos/${stats.recentRepos[0].id}${feature.title === "Architecture Generation" ? "/architecture" : feature.title === "Dependency Tracing" ? "/dependencies" : "/docs"}` : "#") : feature.href ?? "#";
            const disabled = feature.disabled || (feature.requiresRepo && !stats?.recentRepos?.length);
            const Wrapper = disabled ? "div" : Link;
            return (
              <Wrapper key={feature.title} href={disabled ? "#" : href} className={disabled ? "" : "block"}>
                <Card className={`h-full ${disabled ? "" : "transition-shadow hover:shadow-md cursor-pointer"}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </div>
                    <Badge variant={feature.status === "live" ? "default" : "secondary"}>
                      {feature.status === "live" ? "Live" : "Soon"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Wrapper>
            );
          })}
        </div>
      </div>

      {stats && !stats.recentRepos.length && (
        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold">Getting Started</h3>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
            <li><Link href="/repos/new" className="text-primary hover:underline">Submit a GitHub repository URL</Link></li>
            <li>Wait for the ingestion pipeline to complete (clone → parse)</li>
            <li>Generate architecture views, dependency traces, and documentation</li>
          </ol>
        </div>
      )}
    </div>
  );
}
