import { Badge } from "@/components/ui/badge";
import type { CloneStatus, ParseStatus, EmbedStatus, JobStatus } from "@/types/repo";

type Status = CloneStatus | ParseStatus | EmbedStatus | JobStatus;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  queued: { label: "Queued", variant: "outline" },
  running: { label: "Running", variant: "warning" },
  cloning: { label: "Cloning", variant: "warning" },
  parsing: { label: "Parsing", variant: "warning" },
  embedding: { label: "Embedding", variant: "warning" },
  cloned: { label: "Cloned", variant: "success" },
  parsed: { label: "Parsed", variant: "success" },
  embedded: { label: "Embedded", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
};

interface RepoStatusBadgeProps {
  status: Status;
}

export function RepoStatusBadge({ status }: RepoStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
