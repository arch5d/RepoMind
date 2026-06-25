# RepoMind - System Design Document

# High Level Architecture

User
↓
Next.js Frontend
↓
LangGraph Orchestrator
↓
Repository Processing Layer
↓
Knowledge Layer
↓
Intelligence Layer

---

# Layer 1 - Frontend

Responsibilities:

* Repository submission
* Search interface
* Architecture visualization
* Documentation viewer
* Dependency explorer

Technology:

* Next.js
* React
* Tailwind
* React Flow

---

# Layer 2 - Repository Processing

Workflow:

GitHub URL
↓
Repository Clone
↓
File Traversal
↓
AST Parsing
↓
Dependency Extraction

Ignored Directories:

* node_modules
* dist
* build
* .git

Extracted Entities:

* Functions
* Classes
* Components
* Interfaces
* API Routes

---

# Layer 3 - Knowledge Layer

## Semantic Chunking

Chunk Types:

* Function
* Class
* Component
* Service
* Module
* API Route

Metadata:

* file path
* symbol name
* type
* content

---

## Embeddings

Generate vector embeddings for each chunk.

Store:

* embedding
* metadata
* source code

Database:

ChromaDB

---

# ChromaDB Collections

## code_chunks

Stores:

* code
* embeddings
* metadata

## dependency_graph

Stores:

* source node
* target node
* relationship

## architecture_nodes

Stores:

* component information
* service relationships

## documentation_nodes

Stores:

* generated summaries
* documentation artifacts

---

# Layer 4 - LangGraph Agent System

Supervisor Agent

Determines user intent.

Possible intents:

* Search
* Architecture
* Documentation
* Dependency Trace
* Modification Planning

---

## Search Agent

Workflow:

User Query
↓
Query Analysis
↓
Subquery Generation
↓
Vector Retrieval
↓
Reasoning
↓
Response

---

## Architecture Agent

Analyzes:

* Imports
* Services
* APIs
* Database interactions

Produces:

* Graphs
* Mermaid diagrams
* React Flow data

---

## Dependency Agent

Tracks:

Function
↓
Service
↓
Repository
↓
Database

Supports recursive dependency traversal.

---

## Documentation Agent

Generates:

* README
* API Documentation
* Setup Instructions
* Feature Documentation

---

# Repository Search Workflow

User Query
↓
Planner Agent
↓
Retriever Agent
↓
ChromaDB
↓
Relevant Chunks
↓
Reasoning Agent
↓
Final Answer

---

# Architecture Generation Workflow

Repository
↓
AST Parser
↓
Dependency Graph
↓
Architecture Agent
↓
Mermaid Output
↓
React Flow Visualization

---

# Dependency Tracing Workflow

Function
↓
Direct Dependencies
↓
Indirect Dependencies
↓
Database Layer
↓
Trace Visualization

---

# Documentation Generation Workflow

Repository
↓
Parser
↓
Metadata Extraction
↓
Documentation Agent
↓
README
↓
API Docs
↓
Architecture Docs

---

# Recommended Folder Structure

/app

/components

/lib/agents

/lib/chromadb

/lib/github

/lib/parser

/lib/embeddings

/lib/rag

/lib/architecture

/lib/documentation

/lib/dependency

/types

/public

---

# Future Enhancements

* Pull Request Intelligence
* Impact Analysis
* Interactive Architecture Explorer
* Multi-Language AST Support
* Code Change Recommendation Engine
