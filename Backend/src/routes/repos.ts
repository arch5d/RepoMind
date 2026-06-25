import { Router } from "express";
import type { Request } from "express";
import { submitRepo } from "@/lib/jobs/processor";
import {
  listRepos,
  getRepoById,
  deleteRepo,
} from "@/lib/db/repos";
import { listJobsByRepo } from "@/lib/db/jobs";
import { successResponse, errorResponse } from "@/lib/api-response";

export const router = Router();

interface IdParams {
  id: string;
}

router.get("/", (_req, res) => {
  try {
    const repos = listRepos();
    successResponse(res, repos);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/:id", (req: Request<IdParams>, res) => {
  try {
    const repo = getRepoById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: "Repository not found" });
    }
    successResponse(res, repo);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/", async (req, res) => {
  try {
    const { githubUrl, branch } = req.body;
    if (!githubUrl || typeof githubUrl !== "string") {
      return res.status(400).json({ success: false, error: "githubUrl is required" });
    }
    const result = await submitRepo(githubUrl, branch);
    successResponse(res, result, 201);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.delete("/:id", (req: Request<IdParams>, res) => {
  try {
    const deleted = deleteRepo(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Repository not found" });
    }
    successResponse(res, { deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/:id/jobs", (req: Request<IdParams>, res) => {
  try {
    const jobs = listJobsByRepo(req.params.id);
    successResponse(res, jobs);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/:id/process", async (req: Request<IdParams>, res) => {
  try {
    const repo = getRepoById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: "Repository not found" });
    }
    const result = await submitRepo(repo.githubUrl);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});
