import path from "node:path";
import { generateId } from "@/lib/utils";
import { getSymbolsByRepo } from "@/lib/db/symbols";
import { getDependenciesByRepo } from "@/lib/db/dependencies";
import { getRepoById } from "@/lib/db/repos";
import { callLLM } from "@/lib/agents/shared/llm";
import { logger } from "@/lib/logger";
import { saveDocument } from "@/lib/db/documents";
import { extractSections, countWords } from "./markdown";
import type { DocType, GeneratedDocument, DocSection } from "./document-types";

const SECTION_TEMPLATES: Record<DocType, string[]> = {
  readme: ["Overview", "Features", "Installation", "Usage", "Project Structure", "Contributing", "License"],
  api_doc: ["Overview", "Authentication", "Endpoints", "Request Formats", "Response Formats", "Error Codes", "Examples"],
  setup_guide: ["Prerequisites", "Installation", "Configuration", "Running the Project", "Environment Variables", "Troubleshooting"],
  architecture_doc: ["System Overview", "Architecture Diagram", "Component Breakdown", "Data Flow", "Key Design Decisions", "Technology Stack"],
  feature_doc: ["Overview", "Implementation Details", "API References", "Usage Examples", "Configuration", "Related Files"],
};

const PROMPT_TEMPLATES: Record<DocType, string> = {
  readme: `Generate a comprehensive README.md for this repository. Include:
- Project overview and purpose
- Key features
- Installation instructions
- Usage examples with code snippets
- Project structure overview
- Contributing guidelines

Format in Markdown. Be thorough but concise.`,
  api_doc: `Generate API documentation for this repository. Include:
- API overview
- Authentication if applicable
- All API endpoints with HTTP methods and paths
- Request/response formats with examples
- Error codes
- Usage examples

Format in Markdown. Be thorough.`,
  setup_guide: `Generate a setup guide for this repository. Include:
- Prerequisites and dependencies
- Step-by-step installation
- Configuration options
- How to run the project
- Environment variables description
- Troubleshooting common issues

Format in Markdown. Be clear and actionable.`,
  architecture_doc: `Generate architecture documentation for this repository. Include:
- System overview and purpose
- High-level architecture diagram (ASCII or description)
- Component/module breakdown
- Data flow descriptions
- Key design decisions and patterns
- Technology stack

Format in Markdown. Be detailed.`,
  feature_doc: `Generate feature documentation for this repository. Include:
- Feature overview and purpose
- Implementation details with code references
- API endpoints involved
- Usage examples
- Configuration options
- Related source files

Format in Markdown. Be detailed.`,
};

function groupSymbolsByFile(symbols: Awaited<ReturnType<typeof getSymbolsByRepo>>): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const s of symbols) {
    const existing = groups.get(s.filePath) ?? [];
    existing.push(`${s.symbolType} ${s.name}${s.exported ? " (exported)" : ""}`);
    groups.set(s.filePath, existing);
  }
  return groups;
}

function buildCodeContext(repoId: string): string {
  const symbols = getSymbolsByRepo(repoId);
  const dependencies = getDependenciesByRepo(repoId);
  const repo = getRepoById(repoId);

  const fileGroups = groupSymbolsByFile(symbols);
  const fileEntries = Array.from(fileGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 40);

  let context = `Repository: ${repo?.owner}/${repo?.name ?? repoId}\n`;
  context += `Language: ${repo?.language ?? "Unknown"}\n`;
  context += `Description: ${repo?.description ?? "N/A"}\n\n`;

  context += `## File Structure (${fileEntries.length} files)\n\n`;
  for (const [filePath, symbols] of fileEntries) {
    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);
    context += `### ${dir}/${fileName}\n`;
    for (const sym of symbols.slice(0, 8)) {
      context += `- ${sym}\n`;
    }
    context += "\n";
  }

  const relCounts: Record<string, number> = {};
  for (const d of dependencies) {
    relCounts[d.relationship] = (relCounts[d.relationship] ?? 0) + 1;
  }
  context += `## Dependency Summary\n`;
  context += `Total dependencies: ${dependencies.length}\n`;
  for (const [rel, count] of Object.entries(relCounts)) {
    context += `- ${rel}: ${count}\n`;
  }

  const apiRoutes = symbols.filter((s) => s.symbolType === "api_route");
  if (apiRoutes.length > 0) {
    context += `\n## API Routes (${apiRoutes.length})\n`;
    for (const route of apiRoutes.slice(0, 20)) {
      const lines = route.sourceCode.split("\n").slice(0, 3).join("\n");
      context += `- ${route.filePath}:${route.lineNumber} — ${route.name}\n  \`\`\`\n  ${lines}\n  \`\`\`\n`;
    }
  }

  return context;
}

function computeDefaultSections(docType: DocType): DocSection[] {
  const titles = SECTION_TEMPLATES[docType];
  return titles.map((title) => ({
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title,
    content: "",
    level: 2,
  }));
}

export async function generateDocument(
  repoId: string,
  docType: DocType,
  customPrompt?: string,
): Promise<GeneratedDocument> {
  logger.info("document-builder", "Generating document", { repoId, docType });

  const repo = getRepoById(repoId);
  if (!repo) throw new Error(`Repository not found: ${repoId}`);

  const codeContext = buildCodeContext(repoId);
  const systemPrompt = customPrompt ?? PROMPT_TEMPLATES[docType];

  const markdown = await callLLM(
    `You are a technical documentation writer. Generate documentation based on the repository code context provided.

${systemPrompt}

Make it specific to this repository — reference actual file paths, symbol names, and code patterns from the context.`,
    `Repository code context:\n\n${codeContext}\n\nGenerate the documentation now.`,
    0.3,
  );

  const sections = extractSections(markdown);
  const wordCount = countWords(markdown);

  const doc: GeneratedDocument = {
    id: generateId(),
    repoId,
    docType,
    title: SECTION_TEMPLATES[docType][0] ?? `${docType} Documentation`,
    description: `Auto-generated ${docType} documentation for ${repo.owner}/${repo.name}`,
    sections: sections.length > 0 ? sections : computeDefaultSections(docType),
    content: markdown,
    generatedAt: new Date().toISOString(),
    wordCount,
    model: "gpt-4o-mini",
  };

  saveDocument(doc);

  logger.info("document-builder", "Document generated", {
    docId: doc.id,
    docType,
    sections: sections.length,
    words: wordCount,
  });

  return doc;
}

export function getExistingDocument(repoId: string, docType: DocType): GeneratedDocument | null {
  const { getDocumentByRepoAndType } = require("@/lib/db/documents");
  return getDocumentByRepoAndType(repoId, docType);
}

export function listDocuments(repoId: string, docType?: DocType) {
  const { getDocumentsByRepo } = require("@/lib/db/documents");
  return getDocumentsByRepo(repoId, docType);
}
