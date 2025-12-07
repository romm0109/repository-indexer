# Change: Add Full-Text Search Route

## Why
Users need the ability to search for exact text matches within indexed code content, complementing the existing semantic (vector-based) search. Full-text search is essential for finding specific function names, variable names, error messages, or code patterns that require exact or partial string matching rather than semantic similarity.

## What Changes
- Add a new `POST /search/fulltext` endpoint that performs full-text search on the `text` field of stored code chunks
- Support optional payload filters to narrow results (e.g., filter by file path, repository, language)
- Leverage Qdrant's full-text search capabilities with text index on the `text` payload field
- Add corresponding DTO for the new endpoint with validation
- Extend VectorStoreService with full-text search method

## Impact
- Affected specs: `semantic-search` (adding new search capability)
- Affected code:
  - `src/search/search.controller.ts` - New endpoint
  - `src/search/search.service.ts` - New search method
  - `src/search/dto/search.dto.ts` - New DTO
  - `src/vector-store/vector-store.service.ts` - Full-text search method