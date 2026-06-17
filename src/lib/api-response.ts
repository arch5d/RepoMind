import { NextResponse } from "next/server";
import { isAppError, getErrorMessage } from "@/lib/errors";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";
import type { ApiResponse } from "@/types/api";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: unknown, status?: number): NextResponse<ApiResponse<never>> {
  if (isAppError(error)) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: status ?? error.statusCode },
    );
  }

  const message = getErrorMessage(error);
  logger.error("api", "Unhandled error", { error: message });

  const config = getConfig();
  const displayError = config.app.isDev ? message : "An unexpected error occurred";

  return NextResponse.json(
    { success: false, error: displayError },
    { status: status ?? 500 },
  );
}
