import { Router } from "express";
import { getAIProvider } from "@/lib/ai/provider";
import { ensureCollections } from "@/lib/embedding/vector-store";
import { getCloudClient } from "@/config/chroma";
import { logger } from "@/lib/logger";
import type { HealthResponse, ServiceCheck } from "@/types/api";

export const router = Router();

async function checkChroma(): Promise<ServiceCheck> {
  const start = Date.now();

  try {
    const client = getCloudClient();
    await client.listCollections();
    return {
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

router.get("/", async (_req, res) => {
  const start = Date.now();

  const provider = getAIProvider();
  const [chromaCheck, providerInfo] = await Promise.all([
    checkChroma(),
    provider.getProviderInfo(),
  ]);

  ensureCollections().catch((error) => {
    logger.error("health", "Failed to ensure collections", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  const aiCheck: ServiceCheck = {
    status: providerInfo.status,
    error: providerInfo.error,
    latencyMs: providerInfo.latencyMs,
  };

  const allOk = chromaCheck.status === "ok" && aiCheck.status === "ok";
  const someOk = chromaCheck.status === "ok" || aiCheck.status === "ok";

  const response: HealthResponse = {
    status: allOk ? "healthy" : someOk ? "degraded" : "unhealthy",
    version: "0.1.0",
    uptime: process.uptime(),
    checks: {
      chroma: chromaCheck,
      ai: aiCheck,
    },
    provider: providerInfo,
  };

  const statusCode = response.status === "healthy" ? 200 : response.status === "degraded" ? 200 : 503;

  logger.info("health", "Health check completed", {
    status: response.status,
    provider: providerInfo.provider,
    latencyMs: Date.now() - start,
  });

  res.status(statusCode).json(response);
});
