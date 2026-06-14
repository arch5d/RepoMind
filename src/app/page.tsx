import { Brain, GitBranch, Search, FileText, Workflow, GitFork, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRepos } from "@/lib/db/repos";
import Link from "next/link";
import { RepoStatusBadge } from "@/components/repo/repo-status-badge";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Repository Ingestion",
    description: "Clone and analyze GitHub repositories with automatic metadata extraction.",
    icon: GitBranch,
    status: "live",
  },
  {
    title: "Semantic Code Search",
    description: "Ask questions about code and get context-aware answers with source citations.",
    icon: Search,
    status: "planned",
  },
  {
    title: "Architecture Generation",
    description: "Auto-generate component diagrams, service maps, and data flow visualizations.",
    icon: Workflow,
    status: "planned",
  },
  {
    title: "Dependency Tracing",
    description: "Trace execution flow across API routes, services, repositories, and databases.",
    icon: GitFork,
    status: "planned",
  },
  {
    title: "Auto Documentation",
    description: "Generate README, API docs, setup guides, and architecture documentation.",
    icon: FileText,
    status: "planned",
  },
  {
    title: "Modification Planner",
    description: "Plan code changes with intelligent impact analysis and implementation strategy.",
    icon: Pencil,
    status: "planned",
  },
] as const;

export default function DashboardPage() {
  const repos = listRepos();
  const clonedCount = repos.filter((r) => r.cloneStatus === "cloned").length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to RepoMind</h1>
          <p className="text-muted-foreground">
            AI-powered repository intelligence. Understand any codebase in minutes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{repos.length}</p>
              <p className="text-xs text-muted-foreground">Repositories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clonedCount}</p>
              <p className="text-xs text-muted-foreground">Cloned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Search Queries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Documents Generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {repos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Repositories</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {repos.slice(0, 4).map((repo) => (
              <Link key={repo.id} href={`/repos/${repo.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {repo.owner}/{repo.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    {repo.language && (
                      <span className="text-xs text-muted-foreground">{repo.language}</span>
                    )}
                    <RepoStatusBadge status={repo.cloneStatus} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Features</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
                <Badge variant={feature.status === "live" ? "success" : "secondary"}>
                  {feature.status === "live" ? "Live" : "Planned"}
                </Badge>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-6">
        <h3 className="mb-2 font-semibold">Getting Started</h3>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>
            <Link href="/repos/new" className="text-primary hover:underline">
              Submit a GitHub repository URL
            </Link>
          </li>
          <li>Wait for the ingestion pipeline to complete (clone → parse → embed)</li>
          <li>Use semantic search to ask questions about the codebase</li>
          <li>Generate architecture views, dependency traces, and documentation</li>
        </ol>
      </div>
    </div>
  );
}
