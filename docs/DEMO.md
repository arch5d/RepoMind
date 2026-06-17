# RepoMind Demo Script

This demo walks through the complete RepoMind pipeline: clone a GitHub repository, explore it via semantic search, architecture graphs, dependency traces, and auto-generate documentation.

**Prerequisites:** RepoMind running at http://localhost:3000 with Ollama or OpenAI configured.

---

## Step 1: Submit a Repository

**Action:**
```bash
curl -s -X POST http://localhost:3000/api/repos \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/sindresorhus/yoctocolors"}' | jq .
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "repo": { "id": "...", "owner": "sindresorhus", "name": "yoctocolors", "cloneStatus": "cloning" },
    "job": { "id": "...", "type": "clone", "status": "running" }
  }
}
```

**What happens:** The system clones the repo, runs AST parsing to extract symbols (functions, classes, exports), generates code chunks, creates vector embeddings, and stores everything in ChromaDB.

---

## Step 2: Monitor Ingestion Status

**Action:**
```bash
# Poll until status is "completed"
REPO_ID="<id from step 1>"

while true; do
  STATUS=$(curl -s "http://localhost:3000/api/repos/$REPO_ID/status" | jq -r '.data.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ]; then break; fi
  sleep 3
done
```

**Expected output:**
```
Status: cloning
Status: parsing
Status: embedding
Status: completed
```

---

## Step 3: Health Check

**Action:**
```bash
curl -s http://localhost:3000/api/health | jq .
```

**Expected output (Ollama):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "provider": "ollama",
    "model": "qwen3:8b",
    "embeddingModel": "nomic-embed-text"
  }
}
```

---

## Step 4: List Symbols

See what the parser extracted.

**Action:**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/symbols" | jq '.data | length'
```

**Expected output:** Number of parsed symbols (e.g., `6`).

```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/symbols" | jq '.data[:3]'
```

---

## Step 5: Semantic Search

Find code related to a concept.

**Action:**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/search?q=color+terminal" | jq .
```

**Expected output:** Relevant code chunks with file paths, symbol names, and similarity scores.

---

## Step 6: Architecture Graph

Generate the repository's architecture.

**Action:**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/architecture" | jq .
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "layers": 2,
    "modules": 1,
    "nodes": 26
  }
}
```

**Action (graph data):**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/architecture/graph" | jq '.data.nodes[:3]'
```

---

## Step 7: Dependency Graph

**Action:**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/dependencies/graph" | jq '.data | { nodes, edges }'
```

---

## Step 8: Ask Questions (Agent System)

This demonstrates the LangGraph agent pipeline. The system classifies the question's intent and routes to the appropriate agent.

### 8a. Search Question

**Action:**
```bash
curl -s -X POST "http://localhost:3000/api/repos/$REPO_ID/ask" \
  -H "Content-Type: application/json" \
  -d '{"query": "What does this package do?"}' | jq '.data.answer'
```

**Expected output:** A concise explanation of the package with code references.

### 8b. Architecture Question

**Action:**
```bash
curl -s -X POST "http://localhost:3000/api/repos/$REPO_ID/ask" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the architecture"}' | jq '.data.answer'
```

**Expected output:** Architecture analysis with module breakdown and Mermaid diagram.

### 8c. Dependency Trace

**Action:**
```bash
curl -s -X POST "http://localhost:3000/api/repos/$REPO_ID/ask" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the dependencies?"}' | jq '.data.answer'
```

**Expected output:** Dependency chain with call graph.

---

## Step 9: Generate Documentation

**Action:**
```bash
curl -s -X POST "http://localhost:3000/api/repos/$REPO_ID/documentation/generate" \
  -H "Content-Type: application/json" \
  -d '{"type": "readme"}' | jq '.data.content | length'
```

**Expected output:** Character count of generated markdown.

```bash
curl -s -X POST "http://localhost:3000/api/repos/$REPO_ID/documentation/generate" \
  -H "Content-Type: application/json" \
  -d '{"type": "readme"}' | jq -r '.data.content'
```

**Expected output:** Full generated README markdown.

---

## Step 10: List Generated Documents

**Action:**
```bash
curl -s "http://localhost:3000/api/repos/$REPO_ID/documentation" | jq .
```

**Expected output:** List of generated documents with types, word counts, and timestamps.

---

## Full Pipeline (One Script)

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-https://github.com/sindresorhus/yoctocolors}"
BASE="${2:-http://localhost:3000}"

echo "=== RepoMind Demo ==="

echo "1. Submitting $REPO_URL ..."
RESP=$(curl -s -X POST "$BASE/api/repos" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$REPO_URL\"}")
REPO_ID=$(echo "$RESP" | jq -r '.data.repo.id')
echo "   Repo ID: $REPO_ID"

echo "2. Waiting for ingestion..."
while true; do
  STATUS=$(curl -s "$BASE/api/repos/$REPO_ID/status" | jq -r '.data.status')
  echo "   Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 3
done

echo "3. Health check..."
curl -s "$BASE/api/health" | jq .

echo "4. Symbols..."
curl -s "$BASE/api/repos/$REPO_ID/symbols" | jq '.data | length'

echo "5. Search..."
curl -s "$BASE/api/repos/$REPO_ID/search?q=color+terminal" | jq '.data | length'

echo "6. Architecture..."
curl -s "$BASE/api/repos/$REPO_ID/architecture" | jq .

echo "7. Ask (search)..."
curl -s -X POST "$BASE/api/repos/$REPO_ID/ask" \
  -H "Content-Type: application/json" \
  -d '{"query": "What does this package do?"}' | jq '.data.answer' | head -c 500

echo ""
echo "8. Ask (architecture)..."
curl -s -X POST "$BASE/api/repos/$REPO_ID/ask" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the architecture"}' | jq '.data.answer' | head -c 500

echo ""
echo "9. Generate docs..."
curl -s -X POST "$BASE/api/repos/$REPO_ID/documentation/generate" \
  -H "Content-Type: application/json" \
  -d '{"type": "readme"}' | jq '.data.content' | head -c 500

echo ""
echo "=== Demo Complete ==="
```

Save as `demo.sh`, make executable (`chmod +x demo.sh`), and run:
```bash
./demo.sh https://github.com/sindresorhus/yoctocolors
```

---

## Performance Notes (Ollama on CPU)

| Operation | Expected Time |
|-----------|---------------|
| Clone + Parse | 5-15 seconds |
| Embedding | 10-30 seconds |
| Vector Search | < 1 second |
| Architecture Graph | < 1 second |
| Ask (first call) | 60-120 seconds |
| Ask (subsequent calls) | 30-60 seconds |
| Doc Generation | 120-300 seconds |

With OpenAI (`gpt-4o-mini`), all LLM calls complete in 2-10 seconds.
