import { generateId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { SymbolRow } from "@/lib/db/symbols";
import type { SymbolType } from "@/lib/parser/parser-types";
import type { CodeChunk, ChunkType } from "./embedding-types";

const CHUNKABLE_TYPES = new Set<SymbolType>([
  "function",
  "class",
  "interface",
  "component",
  "api_route",
]);

function symbolTypeToChunkType(symbolType: SymbolType): ChunkType | null {
  if (!CHUNKABLE_TYPES.has(symbolType)) return null;
  return symbolType as ChunkType;
}

export function generateChunks(symbols: SymbolRow[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const symbol of symbols) {
    const chunkType = symbolTypeToChunkType(symbol.symbolType);
    if (!chunkType) continue;

    chunks.push({
      id: generateId(),
      repoId: symbol.repoId,
      symbolId: symbol.id,
      filePath: symbol.filePath,
      content: symbol.sourceCode,
      chunkType,
      metadata: {
        name: symbol.name,
        lineNumber: symbol.lineNumber,
        columnNumber: symbol.columnNumber,
        exported: symbol.exported,
      },
    });
  }

  logger.info("embedding.chunker", "Chunks generated", {
    total: chunks.length,
    byType: countByType(chunks),
  });

  return chunks;
}

function countByType(chunks: CodeChunk[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const chunk of chunks) {
    counts[chunk.chunkType] = (counts[chunk.chunkType] ?? 0) + 1;
  }
  return counts;
}
