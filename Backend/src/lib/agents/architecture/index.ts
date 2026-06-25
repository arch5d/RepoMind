import { generateEmbedding } from "@/lib/embedding/embedder";
import { queryEmbeddings, queryCollection } from "@/lib/embedding/vector-store";
import { callLLM, callLLMWithJSON } from "@/lib/agents/shared/llm";
import { logger } from "@/lib/logger";
import { getConfig } from "@/config";
import type { GraphState } from "@/lib/agents/shared/state";
import type { Source } from "@/lib/agents/shared/types";

interface ArchitectureSummary {
  overview: string;
  modules: { name: string; description: string; fileCount: number }[];
  services: { name: string; type: string; description: string }[];
  architectureType: string;
  keyPatterns: string[];
}

export async function runArchitectureAgent(state: GraphState): Promise<Partial<GraphState>> {
  logger.info("agent.architecture", "Starting architecture agent", { query: state.query.slice(0, 80), repoId: state.repoId });

  const config = getConfig();

  const queryEmbedding = await generateEmbedding(`repository architecture and structure ${state.query}`);

  const [codeResults, archResults] = await Promise.all([
    queryEmbeddings(queryEmbedding, 20, { repoId: state.repoId }),
    queryCollection(config.chroma.collections.architectureNodes, queryEmbedding, 10, { repoId: state.repoId }),
  ]);

  const allResults = codeResults.length > 0 ? codeResults : [];
  const archNodes = archResults.length > 0 ? archResults : [];

  if (allResults.length === 0 && archNodes.length === 0) {
    return {
      answer: "I could not find enough code in this repository to analyze its architecture. Please ensure the repository has been parsed and indexed.",
      sources: [],
      agentMessages: ["Architecture agent: no code found in repository"],
    };
  }

  const sources: Source[] = allResults.slice(0, 15).map((r) => ({
    filePath: r.filePath,
    symbolName: r.symbolId,
    symbolType: r.chunkType,
    excerpt: r.content.slice(0, 400),
    score: r.score,
  }));

  const codeContext = allResults
    .slice(0, 15)
    .map((r, i) => `[${i + 1}] File: ${r.filePath}\nSymbol: ${r.symbolId} (${r.chunkType})\n\`\`\`\n${r.content.slice(0, 600)}\n\`\`\``)
    .join("\n\n");

  const archContext = archNodes.length > 0
    ? `\n\nExisting architecture metadata:\n${archNodes.map((n, i) => `[A${i + 1}] ${n.symbolId} — ${n.content.slice(0, 300)}`).join("\n")}`
    : "";

  const summary = await callLLMWithJSON<ArchitectureSummary>(
    `You are a software architecture analyzer. Given code context from a repository, produce a structured architecture summary.

Rules:
- Identify the main modules, services, and their relationships
- Determine the architecture type (microservices, monolith, layered, etc.)
- Highlight key design patterns
- Be concise but thorough

Respond with valid JSON only:
{
  "overview": "2-3 sentence architecture overview",
  "modules": [{"name": "module name", "description": "what it does", "fileCount": number}],
  "services": [{"name": "service/component name", "type": "api|service|database|module|external", "description": "purpose"}],
  "architectureType": "overall architecture pattern",
  "keyPatterns": ["pattern1", "pattern2"]
}`,
    `Repository code for architecture analysis:\n\n${codeContext}${archContext}\n\nUser question: ${state.query}`,
  );

  const mermaidPrompt = `Based on this architecture, generate a Mermaid.js flowchart diagram showing the main components and their relationships.

Architecture overview: ${summary.overview}
Modules: ${summary.modules.map(m => `${m.name}: ${m.description}`).join(", ")}
Services: ${summary.services.map(s => `${s.name} (${s.type}): ${s.description}`).join(", ")}

Respond with ONLY the Mermaid code. Use flowchart TD format. No markdown fences.`;

  const mermaidCode = await callLLM(
    "You are a Mermaid.js diagram generator. Output ONLY valid Mermaid flowchart code. No markdown fences, no explanations.",
    mermaidPrompt,
    0.1,
  );

  const cleanMermaid = mermaidCode.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();

  const answer = `## Architecture Analysis\n\n${summary.overview}\n\n### Architecture Type\n${summary.architectureType}\n\n### Modules\n${summary.modules.map(m => `- **${m.name}**: ${m.description} (${m.fileCount} files)`).join("\n")}\n\n### Services\n${summary.services.map(s => `- **${s.name}** (${s.type}): ${s.description}`).join("\n")}\n\n### Key Patterns\n${summary.keyPatterns.map(p => `- ${p}`).join("\n")}\n\n### Architecture Diagram\n\`\`\`mermaid\n${cleanMermaid}\n\`\`\``;

  return {
    answer,
    sources,
    agentMessages: [
      `Retrieved ${allResults.length} code chunks and ${archNodes.length} architecture nodes`,
      `Generated architecture summary and Mermaid diagram`,
    ],
  };
}
