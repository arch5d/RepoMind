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

const SIDEBAR_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: GitBranch },
  { href: "/search", label: "Search", icon: Search },
  { href: "/repos/[id]/architecture", label: "Architecture", icon: Workflow, disabled: true },
  { href: "/repos/[id]/dependencies", label: "Dependencies", icon: GitFork, disabled: true },
  { href: "/repos/[id]/docs", label: "Documentation", icon: FileText, disabled: true },
  { href: "/planner", label: "Planner", icon: Pencil, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r md:block">
      <nav className="flex flex-col gap-1 p-4">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href.split("[id]")[0] ?? item.href);

          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                item.disabled
                  ? "cursor-not-allowed text-muted-foreground/50"
                  : isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-[10px] text-muted-foreground/50">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
