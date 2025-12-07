## 1. Implementation

- [x] 1.1 Create `FulltextSearchDto` in `src/search/dto/search.dto.ts` with text query, collection name, optional payload filters, and top_k
- [x] 1.2 Add `fulltextSearch` method to `VectorStoreService` using Qdrant's scroll/query with text match filter
- [x] 1.3 Add `fulltextSearch` method to `SearchService` that calls the vector store method
- [x] 1.4 Add `POST /search/fulltext` endpoint to `SearchController`
- [x] 1.5 Add Swagger documentation for the new endpoint

## 2. Testing

- [x] 2.1 Add unit tests for `SearchService.fulltextSearch` method
- [x] 2.2 Add unit tests for `VectorStoreService.fulltextSearch` method
- [x] 2.3 Add e2e test for the `/search/fulltext` endpoint

## 3. Documentation

- [x] 3.1 Update README with full-text search endpoint documentation