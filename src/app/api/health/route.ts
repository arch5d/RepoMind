import { NextResponse } from "next/server";
import { getConfig } from "@/config";
import { getAIProvider } from "@/lib/ai/provider";
import { ensureCollections } from "@/lib/embedding/vector-store";
import { logger } from "@/lib/logger";
import type { HealthResponse, ServiceCheck } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkChroma(): Promise<ServiceCheck> {
  const config = getConfig();
  const start = Date.now();

  try {
    const response = await fetch(`${config.chroma.url}/api/v2/heartbeat`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        status: "error",
        error: `ChromaDB returned ${response.status}`,
        latencyMs: Date.now() - start,
      };
    }

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

export async function GET() {
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

  return NextResponse.json(response, { status: statusCode });
}
