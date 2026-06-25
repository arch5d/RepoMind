import { Annotation } from "@langchain/langgraph";
import type { IntentType, Source } from "./types";

export const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  repoId: Annotation<string>,
  intent: Annotation<IntentType | null>,
  searchResults: Annotation<Source[]>({
    reducer: (_a, b) => b,
  }),
  context: Annotation<string>,
  answer: Annotation<string>,
  sources: Annotation<Source[]>({
    reducer: (_a, b) => b,
  }),
  error: Annotation<string | null>,
  agentMessages: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
  }),
});

export type GraphState = typeof AgentStateAnnotation.State;
export type GraphUpdate = typeof AgentStateAnnotation.Update;
