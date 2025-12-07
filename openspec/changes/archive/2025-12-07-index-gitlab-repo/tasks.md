# Tasks: Index GitLab Repository

1.  **Scaffold Modules**
    *   Create `GitlabModule`, `ChunkingModule`, `EmbeddingModule`, `VectorStoreModule`, `SearchModule`.
    *   Set up configuration validation for env vars.

2.  **Implement GitLab Service**
    *   Implement `fetchRepositoryTree(repoUrl, token)`.
    *   Implement `fetchFileContent(filePath, token)`.
    *   Add unit tests with mocked GitLab API.

3.  **Implement Chunking Service (Core)**
    *   Set up TypeScript compiler API or tree-sitter.
    *   Implement `parseFile(content, filePath)`.
    *   Implement `extractTopLevelSymbols(ast)`.

4.  **Implement Chunking Strategies**
    *   Implement `splitLargeSymbol(symbol)` logic.
    *   Implement `groupSmallSymbols(symbols)` logic.
    *   Add unit tests with sample TS/TSX files.

5.  **Implement Embedding Service**
    *   Integrate with an embedding provider (e.g., OpenAI, local).
    *   Implement `embedDocuments(texts)`.
    *   Implement `embedQuery(text)`.

6.  **Implement Vector Store Service**
    *   Implement `createCollection(name, vectorSize)`.
    *   Implement `upsertPoints(points)`.
    *   Implement `search(vector, limit)`.
    *   Add integration tests with a local Qdrant instance (or mock).

7.  **Implement Search Service**
    *   Implement `search(query)` orchestration.
    *   (Optional) Implement `rerank(results, query)`.

8.  **Implement Orchestrator**
    *   Create a controller/service to trigger the indexing process.
    *   Connect the flow: Fetch -> Chunk -> Embed -> Store.

9.  **E2E Testing**
    *   Run a full indexing and search flow on a test repository.