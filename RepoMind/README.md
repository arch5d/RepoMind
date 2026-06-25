# RepoMind

**AI-powered repository intelligence platform. Supports OpenAI, Ollama, and NVIDIA NIM.**

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
3. **Embed** — each code chunk is vector-embedded (OpenAI text-embedding-3-small, NVIDIA nv-embedqa-e5-v5, or Ollama nomic-embed-text) and stored in ChromaDB.
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
                      │  (OpenAI /   │
                      │   Ollama /   │
                      │   NVIDIA NIM)│
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

RepoMind supports three AI providers. Set `AI_PROVIDER` in `.env.local`:

| Provider | Chat Model | Embedding Model | API Key | Speed | Quality |
|----------|-----------|----------------|---------|-------|---------|
| **OpenAI** | `gpt-4o-mini` | `text-embedding-3-small` (1536d) | Required | Fast | Highest |
| **NVIDIA NIM** | `meta/llama-3.1-8b-instruct` | `nv-embedqa-e5-v5` (1024d) | Required | Fast | High |
| **Ollama** (local) | `qwen3:8b` | `nomic-embed-text` (768d) | None | Slow (CPU) | Good |

**OpenAI** (default):
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**NVIDIA NIM** (cloud API):
```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_CHAT_MODEL=meta/llama-3.1-8b-instruct
NVIDIA_EMBED_MODEL=nvidia/nv-embedqa-e5-v5
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
| AI | LangChain, LangGraph, OpenAI / NVIDIA NIM / Ollama |
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
