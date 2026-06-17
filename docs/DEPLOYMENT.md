# RepoMind Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2+
- 4 GB+ RAM (8 GB recommended for Ollama)
- Git

---

## Quick Deploy (Docker Compose)

### 1. Clone

```bash
git clone <repo-url> repomind
cd repomind
```

### 2. Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required: AI provider
AI_PROVIDER=ollama

# Ollama (local, no API key)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_EMBED_MODEL=nomic-embed-text

# Optional: GitHub token (raises API rate limits)
GITHUB_TOKEN=ghp_...

# Optional: ChromaDB
CHROMA_URL=http://chroma:8000
```

For OpenAI (no GPU needed):
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 3. Start

```bash
docker compose up -d
```

This starts:
- **app** — RepoMind on port 3000
- **chroma** — ChromaDB on port 8000

### 4. Verify

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"healthy","provider":"ollama","model":"qwen3:8b",...}}
```

### 5. Use

Open http://localhost:3000, submit a GitHub repo URL, and wait for the pipeline to complete.

---

## Ollama Setup (Local AI)

ReproMind can run entirely offline with Ollama.

### Option A: Ollama on Host

1. Install Ollama from https://ollama.com
2. Pull models:
   ```bash
   ollama pull qwen3:8b
   ollama pull nomic-embed-text
   ```
3. Keep Ollama running (default port 11434)
4. In `.env.local`: `OLLAMA_BASE_URL=http://host.docker.internal:11434`

### Option B: Ollama in Docker

```yaml
# Add to docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - repomind-net

volumes:
  ollama-data:
```

Then:
```bash
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama pull nomic-embed-text
```

In `.env.local`: `OLLAMA_BASE_URL=http://ollama:11434`

---

## Production Deployment

### Build for Production

```bash
# Build production image
docker build --target production -t repomind:latest .

# Or via Docker Compose (modify docker-compose.yml target)
```

### Environment Variables (Production)

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://repomind.example.com
AI_PROVIDER=openai              # Preferred for production
OPENAI_API_KEY=sk-...
CHROMA_URL=https://chroma.example.com  # Managed ChromaDB
DATABASE_URL=file:./repomind.db        # Or mounted volume
LOG_LEVEL=info
```

### Required Services (Production)

| Service | Requirement | Sizing |
|---------|-------------|--------|
| ChromaDB | Persistent, backed up | 1 GB per 10 repos (avg) |
| SQLite | File system persistence | Minimal |
| AI Provider | OpenAI key or Ollama GPU | OpenAI = fast, Ollama = needs GPU |

### Deploy to VPS

```bash
docker compose -f docker-compose.prod.yml up -d
```

Example `docker-compose.prod.yml`:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    env_file: .env.prod
    volumes:
      - repo-data:/app/data
    depends_on:
      - chroma
    networks:
      - repomind-net
    restart: unless-stopped

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma-data
      - ANONYMIZED_TELEMETRY=FALSE
    volumes:
      - chroma-data:/chroma/chroma-data
    networks:
      - repomind-net
    restart: unless-stopped

  # Optional: Reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - repomind-net

volumes:
  chroma-data:
  repo-data:

networks:
  repomind-net:
    driver: bridge
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name repomind.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### Deploy to Vercel

The frontend can deploy to Vercel, but the API routes depend on ChromaDB and SQLite (local filesystem), so only the UI layer is suitable for Vercel deployment without a managed backend:

```bash
# Not recommended — API routes require local services
vercel --prod
```

For a serverless deployment, you would need:
- Managed ChromaDB (e.g., Chroma Cloud)
- Remote SQLite or PostgreSQL
- API key for OpenAI

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `openai` | `openai` or `ollama` |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama server URL |
| `OLLAMA_CHAT_MODEL` | `qwen3:8b` | Chat model |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server URL |
| `GITHUB_TOKEN` | — | GitHub personal access token |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | `debug`, `info`, `warn`, `error` |
| `JOB_CONCURRENCY` | `3` | Parallel job limit |
| `JOB_CLONE_TIMEOUT_MS` | `300000` | Clone timeout |
| `JOB_PARSE_TIMEOUT_MS` | `600000` | Parse timeout |

---

## Maintenance

### Backup

```bash
# Backup SQLite
cp repomind.db repomind.db.backup

# Backup ChromaDB
docker run --rm -v chroma-data:/data -v $(pwd):/backup alpine tar czf /backup/chroma-backup.tar.gz -C /data .
```

### Restore

```bash
# Restore SQLite
cp repomind.db.backup repomind.db

# Restore ChromaDB
docker run --rm -v chroma-data:/data -v $(pwd):/backup alpine tar xzf /backup/chroma-backup.tar.gz -C /data
```

### Update

```bash
git pull
docker compose build app
docker compose up -d
```

### Data Cleanup

Old Chroma collections with incompatible dimensions (e.g., OpenAI 1536-dim leftovers after switching to Ollama) should be deleted via the ChromaDB admin interface or programmatically:

```typescript
import { ChromaClient } from "chromadb";
const client = new ChromaClient({ path: process.env.CHROMA_URL });
await client.deleteCollection("code_chunks");
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `AbortSignal.timeout` | Model inference too slow | Increase `FETCH_TIMEOUT_MS` in `src/lib/ai/ollama-provider.ts` |
| `ChromaDB connection refused` | Chroma not started | `docker compose up -d chroma` |
| `Embedding dimension mismatch` | Switched AI provider | Delete old Chroma collections |
| `GitHub API rate limit` | No token configured | Set `GITHUB_TOKEN` |
| `Ollama model not found` | Model not pulled | `ollama pull qwen3:8b` |
| `Address already in use` | Port conflict | Change port mapping in docker-compose.yml |
