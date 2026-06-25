import { generateEmbedding } from "@/lib/embedding/embedder";
import { queryEmbeddings } from "@/lib/embedding/vector-store";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { callLLM } from "@/lib/agents/shared/llm";
import { logger } from "@/lib/logger";
import type { GraphState } from "@/lib/agents/shared/state";
import type { Source } from "@/lib/agents/shared/types";

export async function runSearchAgent(state: GraphState): Promise<Partial<GraphState>> {
  logger.info("agent.search", "Starting search agent", { query: state.query.slice(0, 80), repoId: state.repoId });

  let sources: Source[] = [];

  try {
    const queryEmbedding = await generateEmbedding(state.query);
    const results = await queryEmbeddings(queryEmbedding, 15, { repoId: state.repoId });
    sources = results.map((r) => ({
      filePath: r.filePath,
      symbolName: r.symbolId,
      symbolType: r.chunkType,
      excerpt: r.content.slice(0, 500),
      score: r.score,
    }));
  } catch {
    logger.info("agent.search", "Vector search failed, falling back to SQLite keyword search");
    const keywords = state.query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    const allSymbols = state.repoId ? getSymbolsByRepo(state.repoId) : [];
    for (const sym of allSymbols) {
      const text = `${sym.name} ${sym.sourceCode ?? ""}`.toLowerCase();
      const matches = keywords.filter(k => text.includes(k)).length;
      if (matches > 0) {
        sources.push({
          filePath: sym.filePath,
          symbolName: sym.name,
          symbolType: sym.symbolType,
          excerpt: (sym.sourceCode ?? "").slice(0, 500),
          score: matches / keywords.length,
        });
      }
    }
    sources.sort((a, b) => b.score - a.score);
    sources = sources.slice(0, 15);
  }

  const context = sources
    .map((s, i) => `[${i + 1}] File: ${s.filePath}\nType: ${s.symbolType}\n\`\`\`\n${s.excerpt}\n\`\`\``)
    .join("\n\n");

  logger.info("agent.search", "Generating answer from context", { sourceCount: sources.length });

  const systemPrompt = `You are a code analysis assistant. Answer the user's question based on the provided code context.

Rules:
- Use only the provided code context to answer.
- If the context is insufficient, say so clearly.
- Cite specific file paths and code snippets.
- Be concise but thorough.`;

  const userPrompt = `Repository code context:\n\n${context}\n\nUser question: ${state.query}\n\nProvide a helpful answer based on the code above.`;

  const answer = await callLLM(systemPrompt, userPrompt, 0.2);

  return {
    searchResults: sources,
    sources,
    context,
    answer,
    agentMessages: [
      `Retrieved ${sources.length} relevant code chunks`,
      "Generated answer from retrieved context",
    ],
  };
}
