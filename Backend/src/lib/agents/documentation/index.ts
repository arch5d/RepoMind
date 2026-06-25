import { generateEmbedding } from "@/lib/embedding/embedder";
import { queryEmbeddings, queryCollection } from "@/lib/embedding/vector-store";
import { callLLM, callLLMWithJSON } from "@/lib/agents/shared/llm";
import { logger } from "@/lib/logger";
import { getConfig } from "@/config";
import type { GraphState } from "@/lib/agents/shared/state";
import type { Source } from "@/lib/agents/shared/types";

type DocType = "readme" | "api_doc" | "setup_guide" | "architecture_doc" | "feature_doc";

interface DocPlan {
  docType: DocType;
  title: string;
  sections: string[];
}

export async function runDocumentationAgent(state: GraphState): Promise<Partial<GraphState>> {
  logger.info("agent.documentation", "Starting documentation agent", { query: state.query.slice(0, 80), repoId: state.repoId });

  const config = getConfig();
  const queryEmbedding = await generateEmbedding(`generate documentation ${state.query}`);

  const [codeResults, docResults] = await Promise.all([
    queryEmbeddings(queryEmbedding, 20, { repoId: state.repoId }),
    queryCollection(config.chroma.collections.documentationNodes, queryEmbedding, 5, { repoId: state.repoId }),
  ]);

  if (codeResults.length === 0) {
    return {
      answer: "I could not find enough code in this repository to generate documentation. Please ensure the repository has been parsed and indexed.",
      sources: [],
      agentMessages: ["Documentation agent: no code found in repository"],
    };
  }

  const sources: Source[] = codeResults.slice(0, 15).map((r) => ({
    filePath: r.filePath,
    symbolName: r.symbolId,
    symbolType: r.chunkType,
    excerpt: r.content.slice(0, 400),
    score: r.score,
  }));

  const codeContext = codeResults
    .slice(0, 15)
    .map((r, i) => `[${i + 1}] File: ${r.filePath}\nSymbol: ${r.symbolId} (${r.chunkType})\n\`\`\`\n${r.content.slice(0, 600)}\n\`\`\``)
    .join("\n\n");

  const docContext = docResults.length > 0
    ? `\n\nExisting documentation:\n${docResults.map((d) => `- ${d.symbolId}: ${d.content.slice(0, 300)}`).join("\n")}`
    : "";

  const docPlan = await callLLMWithJSON<DocPlan>(
    `You are a documentation planner. Based on the user query and code context, decide what type of documentation to generate.

Types:
- "readme": Project README with overview, features, quick start
- "api_doc": API endpoint documentation with request/response formats
- "setup_guide": Installation and setup instructions
- "architecture_doc": Architecture and design documentation
- "feature_doc": Documentation for a specific feature or module

Respond with valid JSON only:
{
  "docType": "readme|api_doc|setup_guide|architecture_doc|feature_doc",
  "title": "Document title",
  "sections": ["section1", "section2", ...]
}`,
    `User query: ${state.query}\n\nCode context:\n${codeContext}${docContext}`,
  );

  const docContent = await callLLM(
    `You are a technical documentation writer. Generate the requested documentation based on the code context.

Documentation type: ${docPlan.docType}
Title: ${docPlan.title}
Sections to cover: ${docPlan.sections.join(", ")}

Format the documentation in Markdown. Include:
- Code examples where relevant
- File paths and symbol references
- Clear section headers
- Setup instructions if applicable
- API endpoint details if applicable

Make it comprehensive and developer-friendly.`,
    `Code context:\n${codeContext}${docContext}\n\nGenerate the documentation now.`,
    0.3,
  );

  const answer = docContent;

  return {
    answer,
    sources,
    agentMessages: [
      `Retrieved ${codeResults.length} code chunks and ${docResults.length} existing documentation nodes`,
      `Generated ${docPlan.docType} documentation with ${docPlan.sections.length} sections`,
    ],
  };
}
