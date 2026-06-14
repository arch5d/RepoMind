import Link from "next/link";
import { GitBranch, Star, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RepoStatusBadge } from "@/components/repo/repo-status-badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Repository } from "@/types/repo";

interface RepoCardProps {
  repo: Repository;
}

export function RepoCard({ repo }: RepoCardProps) {
  return (
    <Link href={`/repos/${repo.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                {repo.owner}/{repo.name}
              </CardTitle>
              {repo.description && (
                <CardDescription className="mt-1 line-clamp-2 text-sm">
                  {repo.description}
                </CardDescription>
              )}
            </div>
            <ExternalLink className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stars}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {repo.defaultBranch}
            </span>
            <span>{formatRelativeTime(repo.createdAt)}</span>
            <div className="ml-auto flex gap-1">
              <RepoStatusBadge status={repo.cloneStatus} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
