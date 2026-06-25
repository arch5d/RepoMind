import path from "node:path";
import { Project, ScriptTarget, ModuleKind, ModuleResolutionKind, ts } from "ts-morph";
import { logger } from "@/lib/logger";

export interface ProjectLoaderResult {
  project: Project;
  fileCount: number;
  errorCount: number;
}

export function createProject(filePaths: string[], repoDir: string): ProjectLoaderResult {
  const resolvedDir = path.resolve(repoDir);

  const project = new Project({
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      strict: true,
      allowJs: true,
      noEmit: true,
      declaration: false,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      baseUrl: resolvedDir,
      paths: {
        "@/*": ["./src/*"],
      },
    },
  });

  const absolutePaths = filePaths.map((f) => path.join(resolvedDir, f));
  const addedSources = project.addSourceFilesAtPaths(absolutePaths);

  const diagnostics = project.getPreEmitDiagnostics();
  const errors = diagnostics.filter((d) => d.getCategory() === ts.DiagnosticCategory.Error);

  if (errors.length > 0) {
    logger.warn("project-loader", "TypeScript errors in parsed project", {
      errorCount: errors.length,
      firstError: errors[0]?.getMessageText()?.toString(),
    });
  }

  logger.info("project-loader", "Project loaded", {
    files: addedSources.length,
    tsErrors: errors.length,
  });

  return {
    project,
    fileCount: addedSources.length,
    errorCount: errors.length,
  };
}
