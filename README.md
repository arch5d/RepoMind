<h1 align="center">RepoMind</h1>

<p align="center">
AI-powered GitHub Repository Intelligence using Agentic Context-Augmented Generation (CAG).
</p>

<p align="center">
Stop reading code. Start understanding it.
</p>

<p align="center">

<a href="https://repomind-opal.vercel.app">
<img src="https://img.shields.io/badge/Live-Demo-111827?style=for-the-badge&logo=vercel&logoColor=white" />
</a>

<a href="https://github.com/arch5d/RepoMind/blob/main/LICENSE">
<img src="https://img.shields.io/github/license/arch5d/RepoMind?style=for-the-badge" />
</a>

<a href="https://github.com/arch5d/RepoMind/stargazers">
<img src="https://img.shields.io/github/stars/arch5d/RepoMind?style=for-the-badge" />
</a>

<a href="https://github.com/arch5d/RepoMind/network/members">
<img src="https://img.shields.io/github/forks/arch5d/RepoMind?style=for-the-badge" />
</a>

<a href="https://github.com/arch5d/RepoMind/issues">
<img src="https://img.shields.io/github/issues/arch5d/RepoMind?style=for-the-badge" />
</a>

<a href="https://github.com/arch5d/RepoMind/pulls">
<img src="https://img.shields.io/github/issues-pr/arch5d/RepoMind?style=for-the-badge" />
</a>

<a href="https://github.com/arch5d/RepoMind/commits/main">
<img src="https://img.shields.io/github/last-commit/arch5d/RepoMind?style=for-the-badge" />
</a>

</p>

<p align="center">

<img src="https://skillicons.dev/icons?i=nextjs,ts,nodejs,react,tailwind,redis,vercel,github,git" />

</p>

<p align="center">

<a href="https://repomind-opal.vercel.app">Live Demo</a>
•
<a href="https://github.com/arch5d/RepoMind">Source Code</a>
•
<a href="#features">Features</a>
•
<a href="#installation">Installation</a>
•
<a href="#architecture">Architecture</a>
•
<a href="#roadmap">Roadmap</a>

</p>

## Overview

RepoMind is an AI-powered platform that analyzes public GitHub repositories using an Agentic Context-Augmented Generation (CAG) pipeline.

Instead of retrieving isolated vector chunks, RepoMind dynamically selects complete, contextually relevant source files, enabling deeper reasoning about architecture, dependencies, implementation details, and security.

The platform transforms unfamiliar repositories into an interactive knowledge base through natural language querying, architecture visualization, repository intelligence, and automated security analysis.

| Feature | Description |
|----------|-------------|
| Repository Chat | Ask questions about any public GitHub repository |
| Developer Intelligence | Analyze GitHub profiles and contribution patterns |
| Architecture Mapping | Generate Mermaid architecture diagrams |
| Dependency Analysis | Understand module relationships |
| Security Audit | Detect vulnerabilities and exposed secrets |
| Code Review | Context-aware implementation review |
| Tech Stack Detection | Identify frameworks and libraries |
| Agentic CAG | Full-file contextual retrieval instead of chunked RAG |

## Core Capabilities

- Context-aware repository understanding
- Multi-file dependency tracing
- AI-assisted code review
- Security vulnerability analysis
- Interactive architecture visualization
- Repository onboarding assistance
- GitHub profile intelligence
- Browser-first workflow

## Architecture

                    GitHub Repository
                           │
                           ▼
                 Repository Indexing
                           │
                           ▼
              Agentic Context Selection
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
 Full File Context                    Metadata Analysis
        │                                     │
        └──────────────┬──────────────────────┘
                       ▼
                  Gemini Models
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
 Architecture     Code Review     Security Scan
      │                │                │
      └────────────────┼────────────────┘
                       ▼
                 Interactive Answers



  ## Why Agentic CAG?

Traditional repository assistants rely on vector databases that fragment repositories into disconnected chunks.

RepoMind instead loads complete, relevant source files into the model context, preserving architectural relationships and execution flow for significantly better reasoning.

This enables:

- Better architectural understanding
- More accurate code explanations
- Reliable dependency tracing
- Context-aware security analysis

## Installation

```bash
git clone https://github.com/arch5d/RepoMind.git

cd RepoMind

npm install

cp .env.example .env.local

npm run dev
```

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit changes

```bash
git commit -m "Add amazing feature"
```

4. Push

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

## Roadmap

- [x] Repository chat
- [x] Architecture generation
- [x] Security scanning
- [x] Developer profile analysis
- [x] Tech stack detection
- [ ] Private repository support
- [ ] Multi-repository reasoning
- [ ] VS Code extension
- [ ] CLI

---

<p align="center">

Built with TypeScript, Next.js, and modern AI tooling.

If RepoMind helped you, consider giving the repository a ⭐.

</p>
