import { Router } from "express";
import { getSettings, updateSettings, NIM_CHAT_MODELS, NIM_EMBED_MODELS } from "@/lib/settings";
import { successResponse, errorResponse } from "@/lib/api-response";

export const router = Router();

router.get("/", (_req, res) => {
  try {
    successResponse(res, { settings: getSettings(), chatModels: NIM_CHAT_MODELS, embedModels: NIM_EMBED_MODELS });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.put("/", (req, res) => {
  try {
    const { chatModel, embedModel } = req.body;
    const partial: Record<string, string> = {};
    if (typeof chatModel === "string") partial.chatModel = chatModel;
    if (typeof embedModel === "string") partial.embedModel = embedModel;
    const updated = updateSettings(partial);
    successResponse(res, { settings: updated });
  } catch (error) {
    errorResponse(res, error);
  }
});
