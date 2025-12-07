# Proposal: Add Optional Reranker

## Summary
Integrate an optional reranking step in the search pipeline to improve result relevance. The reranker will be conditionally enabled based on the presence of specific environment variables.

## Motivation
While vector search provides good candidate retrieval, it can miss nuances. A reranker (cross-encoder or specific reranking API) significantly improves the ordering of results. Making it optional ensures the system remains lightweight for users who don't need it or don't have the API keys.

## Proposed Changes
1.  **Configuration**: Add `reranker` configuration object to `src/config/configuration.ts` mapping to `RERANKER_URL`, `RERANKER_API_KEY`, and `RERANKER_MODEL`.
2.  **Service**: Create a `RerankerService` (or integrate into `SearchService` if simple enough, but a separate service is cleaner) that handles the interaction with the reranking model.
3.  **Integration**: Update `SearchService.search` to call the reranker if enabled.
4.  **Spec**: Update `semantic-search` spec to explicitly mention the environment variable control mechanism.