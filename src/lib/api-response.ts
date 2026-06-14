import { NextResponse } from "next/server";
import { isAppError, getErrorMessage } from "@/lib/errors";
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

  return NextResponse.json(
    { success: false, error: "An unexpected error occurred" },
    { status: status ?? 500 },
  );
}
