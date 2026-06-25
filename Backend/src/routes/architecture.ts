import { Router } from "express";
import type { Request } from "express";
import { runArchitectureAgent } from "@/lib/agents/architecture";
import { buildArchitectureModel } from "@/lib/architecture/model-builder";
import { computeArchitectureGraph } from "@/lib/architecture/graph-generator";
import { computeArchitectureSummary } from "@/lib/architecture/summary";
import { convertToReactFlow } from "@/lib/architecture/react-flow";
import { buildSystemDesignDiagram, convertSystemDesignToReactFlow } from "@/lib/architecture/system-design";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { GraphState } from "@/lib/agents/shared/state";

export const router = Router({ mergeParams: true });

interface Params {
  repoId: string;
}

router.get("/graph", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const symbols = getSymbolsByRepo(repoId);
    const dependencies = getDependenciesByRepo(repoId);

    const model = buildArchitectureModel(repoId, symbols, dependencies);
    const graph = computeArchitectureGraph(repoId);
    const reactFlow = convertToReactFlow(model);

    successResponse(res, { model, graph, reactFlow });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/summary", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const summary = computeArchitectureSummary(repoId);
    successResponse(res, summary);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/system-design", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const symbols = getSymbolsByRepo(repoId);
    const dependencies = getDependenciesByRepo(repoId);
    const model = buildArchitectureModel(repoId, symbols, dependencies);
    const diagram = buildSystemDesignDiagram(model);
    const reactFlow = convertSystemDesignToReactFlow(diagram);
    successResponse(res, { diagram, reactFlow });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/generate", async (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const state: Partial<GraphState> = {
      query: "Generate architecture overview",
      repoId,
      searchResults: [],
      context: "",
      answer: "",
      sources: [],
      error: null,
      agentMessages: [],
      intent: null,
    };
    const result = await runArchitectureAgent(state as GraphState);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});
