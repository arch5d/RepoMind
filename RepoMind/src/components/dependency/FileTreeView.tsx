"use client";

import { useMemo, useState } from "react";
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, Import } from "lucide-react";

interface FileTreeNode {
  id: string;
  label: string;
  filePath: string;
  symbolType: string;
  exported: boolean;
  module: string;
}

interface FileTreeEdge {
  source: string;
  target: string;
  relationship: string;
  sourceFile: string;
  targetFile: string;
}

interface FileTreeViewProps {
  nodes: FileTreeNode[];
  edges: FileTreeEdge[];
}

interface TreeNode {
  path: string;
  name: string;
  isDir: boolean;
  children: TreeNode[];
  files: FileTreeNode[];
  depth: number;
}

function buildTree(nodes: FileTreeNode[]): TreeNode {
  const root: TreeNode = { path: "", name: "root", isDir: true, children: [], files: [], depth: 0 };

  for (const node of nodes) {
    const parts = node.filePath.replace(/\\/g, "/").split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      let child = current.children.find((c) => c.name === part && c.isDir);
      if (!child) {
        child = {
          path: [...parts.slice(0, i + 1)].join("/"),
          name: part,
          isDir: true,
          children: [],
          files: [],
          depth: i + 1,
        };
        current.children.push(child);
      }
      current = child;
    }

    current.files.push(node);
  }

  return root;
}

function sortTree(node: TreeNode): void {
  node.children.sort((a, b) => a.name.localeCompare(b.name));
  node.files.sort((a, b) => a.label.localeCompare(b.label));
  for (const child of node.children) {
    sortTree(child);
  }
}

export function FileTreeView({ nodes, edges }: FileTreeViewProps) {
  const tree = useMemo(() => {
    const t = buildTree(nodes);
    sortTree(t);
    return t;
  }, [nodes]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const depMap = useMemo(() => {
    const map = new Map<string, { imports: string[]; importedBy: string[] }>();
    for (const node of nodes) {
      map.set(node.id, { imports: [], importedBy: [] });
    }
    for (const edge of edges) {
      const src = map.get(edge.source);
      const tgt = map.get(edge.target);
      if (src) src.imports.push(edge.target);
      if (tgt) tgt.importedBy.push(edge.source);
    }
    return map;
  }, [nodes, edges]);

  const renderNode = (node: TreeNode, level: number): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    const isExpanded = expanded.has(node.path);

    if (node.name !== "root") {
      const hasFiles = node.files.length > 0 || node.children.length > 0;
      result.push(
        <div key={node.path}>
          <button
            onClick={() => toggleDir(node.path)}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-muted/50 transition-colors"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasFiles ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span className="font-medium text-foreground">{node.name}</span>
            <span className="text-xs text-muted-foreground">
              {node.files.length} file{node.files.length !== 1 ? "s" : ""}
              {node.children.length > 0 && `, ${node.children.length} dir${node.children.length !== 1 ? "s" : ""}`}
            </span>
          </button>
        </div>,
      );
    }

    if (isExpanded || node.name === "root") {
      for (const child of node.children) {
        result.push(...renderNode(child, node.name === "root" ? 0 : level + 1));
      }
      for (const file of node.files) {
        const deps = depMap.get(file.id);
        const importCount = deps?.imports.length ?? 0;
        const importedByCount = deps?.importedBy.length ?? 0;
        result.push(
          <div
            key={file.id}
            className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-muted/30 transition-colors"
            style={{ paddingLeft: `${(node.name === "root" ? 0 : level + 1) * 20 + 8}px` }}
            title={`${file.filePath}\nType: ${file.symbolType}\nExported: ${file.exported ? "Yes" : "No"}`}
          >
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-foreground">{file.label}</span>
            {file.exported && (
              <span className="rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                export
              </span>
            )}
            {importCount > 0 && (
              <span className="flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Import className="h-3 w-3" />
                {importCount}
              </span>
            )}
            {importedByCount > 0 && (
              <span className="rounded bg-purple-100 px-1 text-[10px] text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                used by {importedByCount}
              </span>
            )}
          </div>,
        );
      }
    }

    return result;
  };

  if (nodes.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        No file dependency data available. Parse the repository first.
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px] rounded-lg border bg-card p-2 font-mono text-sm">
      {renderNode(tree, 0)}
    </div>
  );
}
