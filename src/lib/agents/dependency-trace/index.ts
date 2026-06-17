import { generateEmbedding } from "@/lib/embedding/embedder";
import { queryEmbeddings } from "@/lib/embedding/vector-store";
import { callLLMWithJSON } from "@/lib/agents/shared/llm";
import { logger } from "@/lib/logger";
import type { GraphState } from "@/lib/agents/shared/state";
import type { Source } from "@/lib/agents/shared/types";

interface DepLink {
  source: string;
  sourceFile: string;
  target: string;
  targetFile: string;
  relationship: string;
}

interface DependencyChain {
  summary: string;
  chain: { step: number; symbol: string; file: string; type: string; description: string }[];
  relationships: DepLink[];
}

export async function runDependencyTraceAgent(state: GraphState): Promise<Partial<GraphState>> {
  logger.info("agent.dependency", "Starting dependency trace agent", { query: state.query.slice(0, 80), repoId: state.repoId });

  const queryEmbedding = await generateEmbedding(`dependency tracing ${state.query}`);

  const hop1Results = await queryEmbeddings(queryEmbedding, 10, { repoId: state.repoId });

  if (hop1Results.length === 0) {
    return {
      answer: "I could not find any relevant symbols to trace dependencies for your query. Please ensure the repository has been parsed and indexed.",
      sources: [],
      agentMessages: ["Dependency agent: no symbols found in repository"],
    };
  }

  const sources: Source[] = hop1Results.slice(0, 10).map((r) => ({
    filePath: r.filePath,
    symbolName: r.symbolId,
    symbolType: r.chunkType,
    excerpt: r.content.slice(0, 300),
    score: r.score,
  }));

  const importPatterns = hop1Results
    .filter((r) => r.content)
    .flatMap((r) => {
      const imports: { from: string; file: string }[] = [];
      const lines = r.content.split("\n");
      for (const line of lines) {
        const importMatch = line.match(
          /(?:import|require|from)\s+['"]([^'"]+)['"]|using\s+([A-Za-z0-9_.]+)/i,
        );
        if (importMatch) {
          imports.push({ from: importMatch[1] ?? importMatch[2] ?? "", file: r.filePath });
        }
      }
      return imports;
    })
    .filter((imp) => imp.from.length > 0)
    .slice(0, 20);

  const hop2Results: typeof hop1Results = [];
  if (importPatterns.length > 0) {
    for (const imp of importPatterns.slice(0, 5)) {
      const hop2Embedding = await generateEmbedding(`module ${imp.from}`);
      const hop2 = await queryEmbeddings(hop2Embedding, 3, { repoId: state.repoId });
      for (const r of hop2) {
        if (!hop2Results.find((existing) => existing.id === r.id)) {
          hop2Results.push(r);
        }
      }
    }
  }

  const knownSymbols = new Set<string>();
  const allSymbols: { symbol: string; file: string; type: string; content: string }[] = [];

  for (const r of [...hop1Results, ...hop2Results]) {
    const key = `${r.filePath}:${r.symbolId}`;
    if (!knownSymbols.has(key)) {
      knownSymbols.add(key);
      allSymbols.push({ symbol: r.symbolId, file: r.filePath, type: r.chunkType, content: r.content });
    }
  }

  const chain = await callLLMWithJSON<DependencyChain>(
    `You are a dependency tracer for code repositories. Given code symbols and their relationships, build a dependency chain.

Rules:
- Trace how data/control flows through the system
- Map relationships between symbols (calls, imports, extends, implements, routes_to)
- Build a step-by-step chain from entry point to data source
- Be concise and specific

Respond with valid JSON only:
{
  "summary": "Brief summary of the dependency chain",
  "chain": [
    {"step": 1, "symbol": "symbol name", "file": "file path", "type": "function|class|api_route|module", "description": "what this does"}
  ],
  "relationships": [
    {"source": "caller", "sourceFile": "caller file", "target": "callee", "targetFile": "callee file", "relationship": "calls|imports|extends|routes_to"}
  ]
}`,
    `User query: ${state.query}\n\nFound symbols and their relationships:\n${allSymbols.map(
      (s) => `Symbol: ${s.symbol}\nFile: ${s.file}\nType: ${s.type}\nContent:\n${s.content.slice(0, 300)}\n---`,
    ).join("\n")}

Import relationships detected:\n${importPatterns.map((imp) => `${imp.file} imports from ${imp.from}`).join("\n")}`,
  );

  const chainText = chain.chain
    .map((c) => `  ${c.step}. **${c.symbol}** (${c.file}) — ${c.description}`)
    .join("\n");

  const relsText = chain.relationships
    .map((r) => `  - ${r.source} → ${r.target} (${r.relationship})`)
    .join("\n");

  const answer = `## Dependency Trace\n\n${chain.summary}\n\n### Chain\n${chainText}\n\n### Relationships\n${relsText}\n\n### Sources\n${sources.map((s) => `- \`${s.filePath}\`: ${s.symbolName}`).join("\n")}`;

  return {
    answer,
    sources,
    agentMessages: [
      `Retrieved ${hop1Results.length} symbols in first hop, ${hop2Results.length} in second hop`,
      `Built dependency chain with ${chain.chain.length} steps and ${chain.relationships.length} relationships`,
    ],
  };
}
