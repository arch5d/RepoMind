import type { Request, Response } from "express";
import { getOrCreateCollection } from "@/config/chroma";

export interface AddDocumentRequest {
  documents: string[];
  ids: string[];
  metadatas: Record<string, any>[];
}

export const addNewDocument = async (
  request: Request<{}, {}, AddDocumentRequest>,
  response: Response,
): Promise<void> => {
  try {
    const { documents, ids, metadatas } = request.body;

    const collection = await getOrCreateCollection("my_collection");

    await collection.add({
      ids,
      documents,
      metadatas,
    });

    response.json({
      message: "Documents added successfully",
      count: documents.length,
    });
  } catch (error) {
    response.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
