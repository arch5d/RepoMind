import { Router } from "express";
import type { Request } from "express";
import { getDocumentsByRepo, getDocumentById } from "@/lib/db/documents";
import { generateDocument } from "@/lib/documentation/document-builder";
import { exportDocument } from "@/lib/documentation/exporter";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { DocType } from "@/lib/documentation/document-types";

export const router = Router({ mergeParams: true });

interface Params {
  repoId: string;
  id: string;
}

router.get("/", (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const { docType } = req.query;
    const docs = getDocumentsByRepo(repoId, docType as DocType | undefined);
    successResponse(res, docs);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/:id", (req: Request<Params>, res) => {
  try {
    const doc = getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    successResponse(res, doc);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/:id/export", (req: Request<Params>, res) => {
  try {
    const doc = getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    const { format } = req.query;
    const exported = exportDocument(doc, (format as "markdown" | "json") ?? "markdown");
    successResponse(res, exported);
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/generate", async (req: Request<Params>, res) => {
  try {
    const repoId = req.params.repoId;
    const { docType } = req.body;
    if (!docType) {
      return res.status(400).json({ success: false, error: "docType is required" });
    }
    const doc = await generateDocument(repoId, docType);
    successResponse(res, doc, 201);
  } catch (error) {
    errorResponse(res, error);
  }
});
