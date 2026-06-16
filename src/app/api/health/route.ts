import { NextResponse } from "next/server";
import { getConfig } from "@/config";
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

async function checkOpenAI(): Promise<ServiceCheck> {
  const config = getConfig();
  const start = Date.now();

  if (!config.openai.apiKey) {
    return {
      status: "error",
      error: "OPENAI_API_KEY not configured",
      latencyMs: Date.now() - start,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        status: "error",
        error: `OpenAI returned ${response.status}`,
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
  const [chromaCheck, openaiCheck] = await Promise.all([
    checkChroma(),
    checkOpenAI(),
  ]);

  const allOk = chromaCheck.status === "ok" && openaiCheck.status === "ok";
  const someOk = chromaCheck.status === "ok" || openaiCheck.status === "ok";

  const response: HealthResponse = {
    status: allOk ? "healthy" : someOk ? "degraded" : "unhealthy",
    version: "0.1.0",
    uptime: process.uptime(),
    checks: {
      chroma: chromaCheck,
      openai: openaiCheck,
    },
  };

  const statusCode = response.status === "healthy" ? 200 : response.status === "degraded" ? 200 : 503;

  logger.info("health", "Health check completed", {
    status: response.status,
    latencyMs: Date.now() - start,
  });

  return NextResponse.json(response, { status: statusCode });
}
