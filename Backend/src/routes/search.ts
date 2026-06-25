import { Router } from "express";
import { runSearchAgent } from "@/lib/agents/search";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { GraphState } from "@/lib/agents/shared/state";

export const router = Router();

router.post("/", async (req, res) => {
  try {
    const { query, repoId } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "query is required" });
    }

    const state: Partial<GraphState> = {
      query,
      repoId: repoId ?? "",
      searchResults: [],
      context: "",
      answer: "",
      sources: [],
      error: null,
      agentMessages: [],
      intent: null,
    };

    const result = await runSearchAgent(state as GraphState);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});
