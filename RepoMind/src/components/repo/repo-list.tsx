"use client";

import * as React from "react";
import { RepoCard } from "@/components/repo/repo-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository } from "@/types/repo";

interface RepoListProps {
  repos: Repository[];
  loading?: boolean;
}

export function RepoList({ repos, loading }: RepoListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-muted-foreground">
          No repositories yet. Submit one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
