# Spec: Semantic Search

## ADDED Requirements

### Requirement: Semantic Search
The system MUST allow users to search the indexed codebase using natural language queries.

#### Scenario: Search by Query
Given a natural language query
When the user searches
Then the system should return relevant code chunks based on vector similarity

### Requirement: Reranking (Optional)
The system MUST support optional reranking of search results.

#### Scenario: Rerank Results
Given a set of search results
When reranking is enabled
Then the results should be re-ordered based on a reranking model's score

### Requirement: Testing
The search functionality MUST be verifiable via end-to-end tests.

#### Scenario: E2E Search Test
Given an indexed repository
When a known query is executed
Then the expected code chunks should be present in the top results