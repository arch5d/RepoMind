import { Router } from "express";
import type { Request } from "express";
import { runDependencyTraceAgent } from "@/lib/agents/dependency-trace";
import { buildDependencyGraph } from "@/lib/dependency/graph-builder";
import { traceSymbol, traceByFile } from "@/lib/dependency/trace-engine";
import { convertDependencyGraph } from "@/lib/dependency/react-flow";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { GraphState } from "@/lib/agents/shared/state";

export const router = Router({ mergeParams: true });

interface Params {
  repoId: string;
  symbolName: string;
}

router.get("/graph", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const scope = (req.query.scope as "file" | "module" | "symbol") ?? "file";
    const includeNoise = req.query.includeNoise === "true";
    const symbolType = req.query.symbolType as string | undefined;

    const graph = buildDependencyGraph(repoId, { scope, includeNoise, symbolType });
    const reactFlow = convertDependencyGraph(graph, scope);
    successResponse(res, { graph, reactFlow });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/trace/:symbolName", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const symbolName = req.params.symbolName;
    const direction = (req.query.direction as string) ?? "forward";
    const result = traceSymbol(repoId, symbolName, direction as "forward" | "backward");
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/trace-file", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: "filePath is required" });
    }
    const result = traceByFile(repoId, filePath);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/generate", async (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const { query } = req.body;
    const state: Partial<GraphState> = {
      query: query ?? "Trace dependencies",
      repoId,
      searchResults: [],
      context: "",
      answer: "",
      sources: [],
      error: null,
      agentMessages: [],
      intent: null,
    };
    const result = await runDependencyTraceAgent(state as GraphState);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error);
  }
});
