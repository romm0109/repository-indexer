# Design: Index GitLab Repository

## Architecture Overview

The system will be composed of the following components:

1.  **GitLab Service:** Responsible for interacting with the GitLab API to fetch repository tree and file contents.
2.  **Chunking Service:** Implements the AST-based chunking logic. It will parse files, extract symbols, and handle splitting/grouping based on token counts.
3.  **Embedding Service:** Interfaces with the embedding model provider (via API or local library) to generate vectors for text chunks.
4.  **Vector Store Service:** Manages interactions with Qdrant for storing and retrieving vectors and metadata.
5.  **Search Service:** Orchestrates the search process, including query embedding, vector search, and optional reranking.
6.  **Orchestrator (Indexer):** Coordinates the flow from fetching to storage.

## Data Flow

1.  **Ingestion:**
    *   User triggers indexing for a Repo URL/ID.
    *   GitLab Service fetches the file list.
    *   For each file:
        *   GitLab Service fetches content.
        *   Chunking Service parses and chunks the content.
        *   Embedding Service generates embeddings for each chunk.
        *   Vector Store Service upserts chunks + embeddings + metadata to Qdrant.

2.  **Search:**
    *   User submits a query.
    *   Embedding Service embeds the query.
    *   Vector Store Service performs a similarity search in Qdrant.
    *   (Optional) Reranking Service reranks results.
    *   Search Service returns formatted results.

## Detailed Chunking Strategy

We will implement a "Semantic AST-based" chunking strategy as requested.

### 1. Unit of Chunking
*   **Top-level symbols:** `FunctionDeclaration`, `ClassDeclaration`, `InterfaceDeclaration`, `TypeAliasDeclaration`, `VariableStatement` (for arrow functions/components).
*   **TSX:** React components.

### 2. Chunk Content
Each chunk will include:
*   File path
*   Symbol name and kind
*   Signature
*   Preceding JSDoc/comments
*   Body code

### 3. Size-Aware Splitting
*   **Constraint:** `MAX_TOKENS` (e.g., 512-1024).
*   **Logic:**
    *   If `tokens(symbol) <= MAX_TOKENS`: Keep as single chunk.
    *   If `tokens(symbol) > MAX_TOKENS`: Split internally on boundaries (blank lines, blocks, JSX).
    *   **Overlap:** Prepend symbol header to sub-chunks; include overlapping lines between sub-chunks.

### 4. Small Symbol Grouping
*   **Constraint:** `MIN_TOKENS` (e.g., 64).
*   **Logic:** Group consecutive small symbols into a "region chunk" (e.g., "helpers near line X").

### 5. Hierarchical Indexing (Future/Optional)
*   File-level summaries.
*   Symbol-level summaries.

## Metadata Schema

Each vector point in Qdrant will have a payload containing:
*   `repo`: string
*   `commit_sha`: string
*   `file_path`: string
*   `symbol_name`: string
*   `symbol_kind`: string
*   `start_line`: number
*   `end_line`: number
*   `text`: string (the actual chunk content)
*   `is_exported`: boolean

## Configuration

Environment variables will control:
*   `GITLAB_URL`
*   `GITLAB_TOKEN`
*   `QDRANT_URL`
*   `QDRANT_API_KEY`
*   `EMBEDDING_MODEL_NAME`
*   `CHUNK_SIZE`
*   `CHUNK_OVERLAP`