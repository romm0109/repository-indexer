# Change: Add Multi-Collection Search Support

## Why
Users need to search across multiple collections (e.g., different repositories, projects, or codebases) in a single query. Currently, all search endpoints only support searching within a single collection, requiring multiple API calls to search across different collections and manual result aggregation on the client side.

## What Changes
- Modify all search DTOs to accept either a single collection name (string) or multiple collection names (array of strings)
- Update [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) methods to handle multi-collection searches
- Update [`SearchService`](src/search/search.service.ts:8) methods to aggregate and deduplicate results from multiple collections
- Maintain backward compatibility with existing single-collection API usage
- Add validation to ensure at least one collection name is provided

## Impact
- **Affected specs:** semantic-search
- **Affected code:**
  - [`src/search/dto/search.dto.ts`](src/search/dto/search.dto.ts:1) - All three DTOs (SearchDto, PayloadSearchDto, FulltextSearchDto)
  - [`src/search/search.service.ts`](src/search/search.service.ts:1) - All three search methods
  - [`src/vector-store/vector-store.service.ts`](src/vector-store/vector-store.service.ts:1) - All three search methods
  - [`test/search.e2e-spec.ts`](test/search.e2e-spec.ts:1) - Add multi-collection test scenarios
- **Breaking changes:** None - backward compatible with single collection string