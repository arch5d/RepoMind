# RepoMind

**AI-powered repository intelligence platform.**

RepoMind helps developers understand unfamiliar codebases through semantic search, architecture generation, dependency tracing, and automated documentation. Submit any GitHub repository URL and get an interactive knowledge graph of its structure, answered questions about its code, and auto-generated documentation.

## Quick Start

```bash
# Clone and start
git clone <repo-url> && cd repomind
cp .env.example .env.local
docker compose up -d

# Open http://localhost:3000
# Submit a GitHub repo URL via the UI or API
```

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| Repository Ingestion | Clone and parse GitHub repos with automatic metadata extraction | Live |
| Semantic Code Search | Ask questions about code, get context-aware answers with source citations | Live |
| Architecture Generation | Auto-generate component diagrams, service maps, data flow visualizations | Live |
| Dependency Tracing | Trace execution flow across API routes, services, repositories, and databases | Live |
| Auto Documentation | Generate README, API docs, setup guides, and architecture documentation | Live |
| Modification Planner | Plan code changes with intelligent impact analysis and implementation strategy | Planned |

## How It Works

1. **Submit** a GitHub repository URL
2. **Clone & Parse** — the repository is cloned and scanned with AST parsing (ts-morph). Functions, classes, interfaces, components, and API routes are extracted.
3. **Embed** — each code chunk is vector-embedded (OpenAI text-embedding-3-small or local nomic-embed-text via Ollama) and stored in ChromaDB.
4. **Explore** — use semantic search, architecture graphs, dependency traces, and auto documentation agents to understand the codebase.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js UI  │────▶│  Next.js API  │────▶│  ChromaDB   │
│  (React,     │     │  Route Hndlrs │     │  (Vector DB)│
│   Tailwind)  │◀────│  (REST)       │◀────│             │
└─────────────┘     └───────┬──────┘     └─────────────┘
                            │
                     ┌──────▼──────┐
                     │  LangGraph   │
                     │  Agents      │
                     │  ──────────  │
                     │  Supervisor  │
                     │  Search      │
                     │  Architecture│
                     │  Dep. Trace  │
                     │  Doc. Gen.   │
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  AI Provider │
                     │  (Ollama     │
                     │   or OpenAI) │
                     └─────────────┘
```

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | System health and provider info |
| `POST` | `/api/repos` | Submit a GitHub repository |
| `GET` | `/api/repos` | List all repositories |
| `GET` | `/api/repos/[id]` | Get repository details |
| `POST` | `/api/repos/[id]/parse` | Trigger re-parse |
| `GET` | `/api/repos/[id]/status` | Ingestion job status |
| `GET` | `/api/repos/[id]/search?q=...` | Semantic code search |
| `POST` | `/api/repos/[id]/ask` | Ask a question (routes to agent) |
| `GET` | `/api/repos/[id]/architecture` | Architecture data |
| `GET` | `/api/repos/[id]/architecture/graph` | Architecture graph |
| `GET` | `/api/repos/[id]/dependencies` | Dependency data |
| `GET` | `/api/repos/[id]/dependencies/graph` | Dependency graph |
| `POST` | `/api/repos/[id]/dependencies/trace` | Trace dependency chain |
| `GET` | `/api/repos/[id]/symbols` | List parsed symbols |
| `GET` | `/api/repos/[id]/documentation` | List generated docs |
| `POST` | `/api/repos/[id]/documentation/generate` | Generate documentation |
| `GET` | `/api/repos/[id]/documentation/download` | Download documentation |

## Configuration

Environment variables are set in `.env.local` (copy from `.env.example`).

### AI Provider

**OpenAI** (default):
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Ollama** (local, no API key):
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

### ChromaDB

```env
CHROMA_URL=http://localhost:8000
```

### GitHub

```env
GITHUB_TOKEN=ghp_...      # Optional, raises rate limits
```

### Jobs

```env
JOB_CONCURRENCY=3         # Parallel clone/parse jobs
JOB_CLONE_TIMEOUT_MS=300000
JOB_PARSE_TIMEOUT_MS=600000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui, React Flow |
| Backend | Node.js, Next.js Route Handlers |
| AI | LangChain, LangGraph, OpenAI / Ollama |
| Vector DB | ChromaDB |
| Code Analysis | ts-morph (AST), simple-git |
| Database | SQLite (better-sqlite3) |
| Visualization | React Flow / Mermaid |
| Deployment | Docker, Docker Compose |

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Docker (full stack)
docker compose up --build -d
```

## License

Private — internal use.
