# RepoMind Architecture

## System Overview

RepoMind is a multi-layer system that ingests GitHub repositories, parses them into structured code chunks, stores vector embeddings in ChromaDB, and exposes intelligent agents (LangGraph) that answer questions about the codebase.

```
┌─────────────────────────────────────────────────────┐
│                   Frontend Layer                     │
│  Next.js 15 · React 19 · Tailwind · React Flow      │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐      │
│  │Dashboard│ │ Repo     │ │ Visualizations    │      │
│  │         │ │ Detail   │ │ (Graph, Search,   │      │
│  │         │ │          │ │  Documentation)   │      │
│  └─────────┘ └──────────┘ └──────────────────┘      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (REST)
┌──────────────────────▼──────────────────────────────┐
│                    API Layer                         │
│  Next.js Route Handlers · Zod Validation            │
│  ┌──────┐ ┌────┐ ┌──────┐ ┌──────┐ ┌───────────┐   │
│  │Repos  │ │Ask │ │Search│ │Arch  │ │Document   │   │
│  │CRUD   │ │    │ │      │ │      │ │Generation │   │
│  └──────┘ └────┘ └──────┘ └──────┘ └───────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               Job Pipeline Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐      │
│  │ Clone    │─▶│  AST     │─▶│ Embed + Store  │      │
│  │ (simple- │  │  Parse   │  │ (ChromaDB)    │      │
│  │  git)    │  │(ts-morph)│  │               │      │
│  └──────────┘  └──────────┘  └───────────────┘      │
│    SQLite (repo metadata, symbols, jobs)              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              LangGraph Agent Layer                   │
│                                                      │
│  ┌────────────┐  ┌──────────────────────────────┐   │
│  │ Supervisor  │─▶│ classifyIntent → route query │   │
│  └──────┬─────┘  └──────────────────────────────┘   │
│         │                                            │
│    ┌────┼────┬────┬────┐                            │
│    ▼    ▼    ▼    ▼    ▼                            │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌─────┐                       │
│  │Sr│ │Ar│ │De│ │Do│ │Mod  │                       │
│  │ch│ │ch│ │p  │ │c │ │Plan │                       │
│  └──┘ └──┘ └──┘ └──┘ └─────┘                       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                AI Provider Layer                     │
│  ┌────────────────┐    ┌────────────────────┐        │
│  │ OpenAI Provider │    │  Ollama Provider    │        │
│  │ gpt-4o-mini     │    │  qwen3:8b          │        │
│  │ text-embedding- │    │  nomic-embed-text  │        │
│  │ 3-small         │    │                    │        │
│  └────────────────┘    └────────────────────┘        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Data Layer                              │
│  ┌────────────────────┐  ┌────────────────────────┐  │
│  │   SQLite           │  │   ChromaDB              │  │
│  │   (better-sqlite3) │  │   Collections:          │  │
│  │   · repos          │  │   · code_chunks         │  │
│  │   · symbols        │  │   · dependency_graph    │  │
│  │   · jobs           │  │   · architecture_nodes  │  │
│  │   · dependencies   │  │   · documentation_nodes │  │
│  │   · documents      │  │                         │  │
│  └────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Layer Details

### 1. Frontend Layer

Location: `src/app/`, `src/components/`

The UI is built with Next.js 15 App Router, React 19, and Tailwind CSS. Key pages:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Repo list, stats, feature overview |
| Repo Detail | `/repos/[id]` | Single repo view with tabs |
| Submit Repo | `/repos/new` | URL submission form |

Components are organized by domain:
- `components/repo/` — Repo cards, status badges, submit forms
- `components/architecture/` — Architecture graphs (React Flow + Mermaid)
- `components/dependency/` — Dependency trace graphs
- `components/documentation/` — Documentation viewer and toolbar
- `components/layout/` — Header, sidebar, theme toggle
- `components/ui/` — shadcn/ui primitives (card, button, badge, etc.)

### 2. API Layer

Location: `src/app/api/`

All endpoints are Next.js Route Handlers. The response format is standardized:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Key route files:
- `api/repos/route.ts` — POST (submit), GET (list)
- `api/repos/[id]/route.ts` — GET, DELETE repo
- `api/repos/[id]/status/route.ts` — Job status polling
- `api/repos/[id]/ask/route.ts` — Agent query entry point
- `api/repos/[id]/search/route.ts` — Vector search
- `api/repos/[id]/architecture/graph/route.ts` — Architecture graph
- `api/repos/[id]/dependencies/trace/route.ts` — Dependency tracing
- `api/repos/[id]/documentation/generate/route.ts` — Doc generation

### 3. Job Pipeline

Location: `src/lib/jobs/`

The `submitRepo` function orchestrates the ingestion pipeline:

1. **Clone** (`src/lib/github/clone.ts`) — Clones with `simple-git`, stores in `data/repos/{id}/`
2. **Parse** (`src/lib/parser/`) — Uses `ts-morph` to extract AST symbols (functions, classes, interfaces, API routes, imports/exports)
3. **Chunk** (`src/lib/embedding/chunker.ts`) — Generates semantic code chunks from parsed symbols
4. **Embed** (`src/lib/embedding/embedder.ts`) — Creates vector embeddings via AI provider
5. **Store** (`src/lib/embedding/vector-store.ts`) — Upserts into ChromaDB collections

### 4. LangGraph Agent Layer

Location: `src/lib/agents/`

The agent system uses LangGraph StateGraph with a supervisor-router pattern:

#### Supervisor Agent (`src/lib/agents/supervisor/index.ts`)
- Entry point for `POST /api/repos/[id]/ask`
- Classifies user query intent via `callLLMWithJSON`
- Routes to the appropriate sub-agent
- Intents: `search`, `architecture`, `dependency_trace`, `documentation`

#### Search Agent (`src/lib/agents/search/index.ts`)
- Generates sub-queries from the user's question
- Retrieves relevant code chunks via vector similarity search
- Synthesizes an answer with source citations
- Returns: answer text + source file references

#### Architecture Agent (`src/lib/agents/architecture/index.ts`)
- Queries architecture graph from ChromaDB
- Analyzes module/service structure
- Generates Mermaid diagram
- Returns: architecture type + module breakdown + diagram

#### Dependency Trace Agent (`src/lib/agents/dependency-trace/index.ts`)
- Starts from a target symbol
- Traces dependency chain (imports → calls → uses)
- Supports recursive traversal
- Returns: dependency chain + relationship map

#### Documentation Agent (`src/lib/agents/documentation/index.ts`)
- Retrieves relevant code chunks
- Plans document structure (type, title, sections)
- Generates full markdown document
- Returns: formatted documentation

### 5. AI Provider Layer

Location: `src/lib/ai/`

Abstract provider interface (`types.ts`):

```typescript
interface AIProvider {
  chat(options: ChatOptions): Promise<string>;
  chatWithJSON<T>(options: ChatOptions): Promise<T>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getProviderInfo(): Promise<ProviderInfo>;
}
```

Two implementations:
- **OpenAI** (`openai-provider.ts`) — Uses OpenAI SDK, 1536-dim embeddings
- **Ollama** (`ollama-provider.ts`) — Local inference via HTTP API, 768-dim embeddings

Switched via `AI_PROVIDER` environment variable.

### 6. Data Layer

#### SQLite (`src/lib/db/`)
Relational store managed by `better-sqlite3`. Tables:
- `repos` — Repository metadata (owner, name, URL, language, status)
- `symbols` — Parsed AST symbols (name, type, filePath, lineNumber, sourceCode)
- `jobs` — Ingestion job tracking (type, status, timestamps)
- `dependencies` — Extracted dependency edges (source → target, relationship)
- `documents` — Generated documentation artifacts

#### ChromaDB
Vector store with 4 collections:
| Collection | Dimensions | Content |
|-----------|-----------|---------|
| `code_chunks` | 768 or 1536 | Embedded code chunks with metadata |
| `dependency_graph` | 768 or 1536 | Dependency relationship nodes |
| `architecture_nodes` | 768 or 1536 | Architecture component nodes |
| `documentation_nodes` | 768 or 1536 | Documentation summaries |

Dimension is 1536 with OpenAI, 768 with Ollama/nomic-embed-text.

## Data Flow: Submit → Explore

```
User submits GitHub URL
        │
        ▼
POST /api/repos  ───→  submitRepo()
        │                 ├── parseGitHubUrl()
        │                 ├── cloneRepository()
        │                 ├── parseRepository()
        │                 ├── generateChunks()
        │                 ├── generateEmbeddings()
        │                 └── upsertEmbeddings()
        │
        ▼
User opens repo detail  ───→  POST /api/repos/[id]/ask("how does X work?")
        │                         │
        │                         ▼
        │                   classifyIntent()
        │                    ├── "search" → searchAgent()
        │                    ├── "architecture" → architectureAgent()
        │                    ├── "dependency_trace" → depTraceAgent()
        │                    └── "documentation" → docAgent()
        │
        ▼
User sees answer + sources + optional graph
```

## Key Design Decisions

1. **Agent-based query routing** — Single `ask` endpoint classifies intent and delegates, keeping the API surface simple and the system extensible.

2. **ChromaDB for vector + metadata** — ChromaDB stores both embeddings and metadata (file path, symbol name, chunk type), enabling filtered search by repo ID without a separate index.

3. **Provider abstraction** — The `AIProvider` interface allows hot-swapping between OpenAI and Ollama without changing any agent code.

4. **SQLite + ChromaDB dual storage** — SQLite handles transactional metadata (repos, jobs, symbols); ChromaDB handles vector search. Each is optimized for its workload.

5. **LangGraph StateGraph** — Supports multi-step agent workflows with shared state, making it easy to add new agent types or compose agents.

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # Route handlers
│   ├── layout.tsx          # Root layout (Header + Sidebar)
│   └── page.tsx            # Dashboard
├── components/             # React components
│   ├── architecture/       # Architecture graph viz
│   ├── dependency/         # Dependency graph viz
│   ├── documentation/      # Doc viewer
│   ├── layout/             # Header, sidebar
│   ├── repo/              # Repo cards, forms
│   └── ui/                # shadcn/ui primitives
├── config/                 # Environment config
├── lib/
│   ├── agents/             # LangGraph agents
│   │   ├── supervisor/     # Intent classifier + router
│   │   ├── search/         # Semantic search agent
│   │   ├── architecture/   # Architecture analysis agent
│   │   ├── dependency-trace/ # Dependency tracing agent
│   │   ├── documentation/  # Documentation generation agent
│   │   └── shared/         # Shared types, LLM helper
│   ├── ai/                 # AI provider abstraction
│   ├── architecture/       # Architecture graph builder
│   ├── db/                 # SQLite database layer
│   ├── dependency/         # Dependency graph builder
│   ├── documentation/      # Document builder
│   ├── embedding/          # Chunking, embedding, vector store
│   ├── github/             # Clone, metadata, validation
│   ├── jobs/               # Job pipeline (clone → parse → embed)
│   ├── parser/             # AST parser (ts-morph)
│   ├── api-response.ts     # Standardized HTTP responses
│   └── logger.ts           # Structured logging
└── types/                  # TypeScript type definitions
```
