# Proposal: Index GitLab Repository

## Summary
Implement a service to fetch a repository from GitLab, process its files using a semantic chunking strategy (AST-based), store embeddings in Qdrant, and provide a semantic search interface.

## Motivation
The current system lacks the ability to ingest and semantically search codebases. This change enables users to index GitLab repositories and perform context-aware searches, which is essential for LLM context retrieval and code understanding tasks.

## Proposed Solution
We will introduce a new pipeline that:
1.  **Fetches** repository content from GitLab.
2.  **Chunks** code files using an AST-based strategy (focusing on TypeScript/TSX initially) to ensure semantic coherence.
3.  **Embeds** chunks using a configured embedding model.
4.  **Stores** vectors and metadata in Qdrant.
5.  **Searches** the vector database with optional reranking.

## Risks & Mitigation
-   **Performance:** Large repositories might take a long time to process. *Mitigation:* Implement asynchronous processing and potentially parallelize chunking/embedding.
-   **Token Limits:** Large files or symbols might exceed embedding model limits. *Mitigation:* Implement the specified size-aware splitting strategy.
-   **Complexity:** AST parsing can be complex. *Mitigation:* Use established libraries like `typescript` compiler API or `tree-sitter`.