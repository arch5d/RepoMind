import { StateGraph, START, END } from "@langchain/langgraph";
import { callLLMWithJSON } from "@/lib/agents/shared/llm";
import { AgentStateAnnotation } from "@/lib/agents/shared/state";
import { runSearchAgent } from "@/lib/agents/search";
import { runArchitectureAgent } from "@/lib/agents/architecture";
import { runDependencyTraceAgent } from "@/lib/agents/dependency-trace";
import { runDocumentationAgent } from "@/lib/agents/documentation";
import { logger } from "@/lib/logger";
import type { IntentType } from "@/lib/agents/shared/types";
import type { GraphState } from "@/lib/agents/shared/state";

async function classifyIntent(state: GraphState): Promise<Partial<GraphState>> {
  logger.info("agent.supervisor", "Classifying intent", { query: state.query.slice(0, 80) });

  const result = await callLLMWithJSON<{ intent: IntentType; reasoning: string }>(
    `You are a query classifier for a code analysis platform. Classify the user's question into one of these intents:

- "search": Questions about how specific code works, what a function does, finding relevant code. General code Q&A.
- "architecture": Questions about overall system design, component relationships, architecture diagrams, high-level structure.
- "dependency_trace": Questions about import chains, dependency graphs, what depends on what.
- "documentation": Requests to generate or explain documentation, README content, API docs.

Respond with JSON: { "intent": "...", "reasoning": "..." }`,
    state.query,
  );

  logger.info("agent.supervisor", "Intent classified", {
    intent: result.intent,
    reasoning: result.reasoning,
  });

  return {
    intent: result.intent,
    agentMessages: [`Classified intent: ${result.intent} — ${result.reasoning}`],
  };
}

const INTENT_ROUTING: Record<IntentType, string> = {
  search: "searchAgent",
  architecture: "architectureAgent",
  dependency_trace: "dependencyTraceAgent",
  documentation: "documentationAgent",
};

function routeAfterClassification(state: GraphState): string[] {
  const intent = state.intent;
  if (intent && intent in INTENT_ROUTING) {
    return [INTENT_ROUTING[intent as IntentType]];
  }
  return ["searchAgent"];
}

function buildSupervisorGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("classifyIntent", classifyIntent)
    .addNode("searchAgent", runSearchAgent)
    .addNode("architectureAgent", runArchitectureAgent)
    .addNode("dependencyTraceAgent", runDependencyTraceAgent)
    .addNode("documentationAgent", runDocumentationAgent)
    .addEdge(START, "classifyIntent")
    .addConditionalEdges("classifyIntent", routeAfterClassification)
    .addEdge("searchAgent", END)
    .addEdge("architectureAgent", END)
    .addEdge("dependencyTraceAgent", END)
    .addEdge("documentationAgent", END);

  return workflow.compile();
}

export async function runAgent(input: { query: string; repoId: string }) {
  const graph = buildSupervisorGraph();

  const initialState: GraphState = {
    query: input.query,
    repoId: input.repoId,
    intent: null,
    searchResults: [],
    context: "",
    answer: "",
    sources: [],
    error: null,
    agentMessages: [],
  };

  const result = await graph.invoke(initialState);

  return {
    answer: result.answer,
    sources: result.sources,
    intent: result.intent,
    agentMessages: result.agentMessages,
  };
}

export type SupervisorOutput = Awaited<ReturnType<typeof runAgent>>;
