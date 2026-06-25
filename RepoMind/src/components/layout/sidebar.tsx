"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Search,
  FileText,
  Workflow,
  GitFork,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { SettingsDialog } from "@/components/layout/SettingsDialog";

const SIDEBAR_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  requiresRepo?: boolean;
}> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: GitBranch },
  { href: "/search", label: "Search", icon: Search },
  { href: "/repos/[id]/architecture", label: "Architecture", icon: Workflow, requiresRepo: true },
  { href: "/repos/[id]/dependencies", label: "Dependencies", icon: GitFork, requiresRepo: true },
  { href: "/repos/[id]/docs", label: "Documentation", icon: FileText, requiresRepo: true },
  { href: "/planner", label: "Planner", icon: Pencil, disabled: true },
];

function resolveHref(href: string, repoId: string | null): string {
  if (!repoId || !href.includes("[id]")) return href;
  return href.replace("[id]", repoId);
}

export function Sidebar() {
  const pathname = usePathname();
  const sidebar = useSidebar();

  const repoId = React.useMemo(() => {
    const match = pathname.match(/\/repos\/([^/]+)/);
    return match ? (match[1] ?? null) : null;
  }, [pathname]);

  return (
    <aside
      className={cn(
        "hidden border-r transition-all duration-200 md:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto",
        sidebar.open ? "w-56 shrink-0" : "w-0 overflow-hidden",
      )}
    >
      <nav className="flex flex-col gap-1 p-4 w-56 h-full">
        <div className="flex-1 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const href = resolveHref(item.href, repoId);
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(href.split("/").slice(0, 4).join("/"));
            const disabled = item.disabled || (item.requiresRepo && !repoId);

            return (
              <Link
                key={item.label}
                href={disabled ? "#" : href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={(e) => disabled && e.preventDefault()}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebar.open && <span>{item.label}</span>}
                {sidebar.open && item.disabled && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">Soon</span>
                )}
              </Link>
            );
          })}
        </div>
        {sidebar.open && <SettingsDialog />}
      </nav>
    </aside>
  );
}
