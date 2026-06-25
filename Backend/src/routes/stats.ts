import { Router } from "express";
import { listRepos } from "@/lib/db/repos";
import { getDocumentsByRepo } from "@/lib/db/documents";
import { getSymbolCount } from "@/lib/db/symbols";
import { getDependencyCount } from "@/lib/db/dependencies";
import { successResponse, errorResponse } from "@/lib/api-response";

export const router = Router();

router.get("/", async (_req, res) => {
  try {
    const repos = listRepos();
    const cloned = repos.filter((r) => r.cloneStatus === "cloned").length;
    const parsed = repos.filter((r) => r.parseStatus === "parsed").length;
    const embedded = repos.filter((r) => r.embedStatus === "embedded").length;

    let totalSymbols = 0;
    let totalDeps = 0;
    let totalDocs = 0;
    const recentDocs: { id: string; docType: string; title: string; repoId: string }[] = [];

    for (const repo of repos) {
      totalSymbols += getSymbolCount(repo.id);
      totalDeps += getDependencyCount(repo.id);
      const repoDocs = getDocumentsByRepo(repo.id);
      totalDocs += repoDocs.length;
      for (const d of repoDocs.slice(-2)) {
        recentDocs.push({ id: d.id, docType: d.docType, title: d.title, repoId: repo.id });
      }
    }

    successResponse(res, {
      repos: repos.length,
      cloned,
      parsed,
      embedded,
      symbols: totalSymbols,
      dependencies: totalDeps,
      documents: totalDocs,
      recentRepos: repos.slice(-3).reverse().map((r) => ({ id: r.id, owner: r.owner, name: r.name, language: r.language, cloneStatus: r.cloneStatus })),
      recentDocs: recentDocs.slice(-5).reverse(),
    });
  } catch (error) {
    errorResponse(res, error);
  }
});
