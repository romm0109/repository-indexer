# Proposal: Enhance Search Query with LLM Refinement

## Summary
This proposal introduces an optional query refinement step in the search process. When a user provides a `prompt` explaining the indexed data alongside their search query, the system will use an LLM to generate one or more effective search queries (query expansion) before embedding and searching. The system will then aggregate documents from all generated queries and rerank them against the user's original query. This aims to improve search relevance by leveraging the LLM's understanding of the repository context and maximizing recall through multiple query perspectives.

## Motivation
Users often search with natural language queries that may not directly match the terminology or structure of the indexed code. By allowing users to provide context (a "prompt") and using an LLM to refine the query, we can bridge the gap between user intent and the vector store's content, leading to better search results.

## Proposed Solution
1.  **Update API**: Modify `SearchDto` to accept an optional `prompt` field.
2.  **Query Refinement Logic**: In `SearchService`, if `prompt` is present, call an LLM (via a new or existing service) to generate multiple refined queries.
3.  **Search & Rerank**: Execute vector search for all generated queries, deduplicate results, and rerank the combined set of documents against the original user query.
4.  **Configuration**: Add environment variables to configure the refinement model (URL, API Key, Model Name).
4.  **Documentation**: Update README and Swagger docs.

## Alternatives Considered
-   **Client-side refinement**: The client could refine the query before sending it. However, doing it server-side allows us to enforce consistency, manage API keys securely, and potentially inject system-level context about the repository structure in the future.
-   **Reranking only**: We already have reranking. Query refinement is complementary; it improves the initial retrieval set, which reranking then optimizes.

## Risks
-   **Latency**: Adding an LLM call increases search latency. This is mitigated by making it optional.
-   **Cost**: LLM calls incur costs.
-   **Hallucination**: The LLM might generate a query that drifts from the user's intent. Prompt engineering will be crucial.