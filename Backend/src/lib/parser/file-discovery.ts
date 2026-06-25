import fs from "node:fs";
import path from "node:path";
import { logger } from "@/lib/logger";

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".cache",
  "coverage",
  ".nyc_output",
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

export interface FileDiscoveryResult {
  files: string[];
  ignored: string[];
}

function shouldIgnoreDir(dirName: string, ignoreDirs: Set<string>): boolean {
  return ignoreDirs.has(dirName) || dirName.startsWith(".");
}

export function discoverSourceFiles(
  repoDir: string,
  extraIgnorePatterns: string[] = [],
): FileDiscoveryResult {
  const ignoreDirs = new Set(DEFAULT_IGNORE_DIRS);
  for (const pattern of extraIgnorePatterns) {
    ignoreDirs.add(pattern);
  }

  const files: string[] = [];
  const ignored: string[] = [];
  const resolvedRepoDir = path.resolve(repoDir);

  if (!fs.existsSync(resolvedRepoDir)) {
    logger.warn("file-discovery", "Repository directory does not exist", {
      path: resolvedRepoDir,
    });
    return { files: [], ignored: [] };
  }

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      ignored.push(dir);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name, ignoreDirs)) {
          ignored.push(fullPath);
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(resolvedRepoDir);

  const relativeFiles = files.map((f) => path.relative(resolvedRepoDir, f));
  const relativeIgnored = ignored.map((f) => path.relative(resolvedRepoDir, f));

  logger.info("file-discovery", "Source files discovered", {
    total: files.length,
    ignored: ignored.length,
    repoDir,
  });

  return { files: relativeFiles, ignored: relativeIgnored };
}
