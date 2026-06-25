import type { Response } from "express";
import { isAppError, getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function successResponse<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function errorResponse(res: Response, error: unknown, status?: number): void {
  if (isAppError(error)) {
    res.status(status ?? error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  const message = getErrorMessage(error);
  logger.error("api", "Unhandled error", { error: message });

  const displayError = process.env.NODE_ENV === "development" ? message : "An unexpected error occurred";

  res.status(status ?? 500).json({
    success: false,
    error: displayError,
  });
}
