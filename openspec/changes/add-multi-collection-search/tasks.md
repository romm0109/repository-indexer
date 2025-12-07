# Implementation Tasks

## 1. Update DTOs
- [ ] 1.1 Modify [`SearchDto.collectionName`](src/search/dto/search.dto.ts:11) to accept `string | string[]`
- [ ] 1.2 Modify [`PayloadSearchDto.collectionName`](src/search/dto/search.dto.ts:26) to accept `string | string[]`
- [ ] 1.3 Modify [`FulltextSearchDto.collectionName`](src/search/dto/search.dto.ts:44) to accept `string | string[]`
- [ ] 1.4 Add validation decorators to ensure at least one collection name is provided
- [ ] 1.5 Update API documentation with examples for both single and multiple collections

## 2. Update VectorStoreService
- [ ] 2.1 Modify [`search()`](src/vector-store/vector-store.service.ts:57) to accept `string | string[]` for collectionName
- [ ] 2.2 Implement collection iteration and result aggregation in [`search()`](src/vector-store/vector-store.service.ts:57)
- [ ] 2.3 Modify [`searchByPayload()`](src/vector-store/vector-store.service.ts:73) to accept `string | string[]` for collectionName
- [ ] 2.4 Implement collection iteration and result aggregation in [`searchByPayload()`](src/vector-store/vector-store.service.ts:73)
- [ ] 2.5 Modify [`fulltextSearch()`](src/vector-store/vector-store.service.ts:103) to accept `string | string[]` for collectionName
- [ ] 2.6 Implement collection iteration and result aggregation in [`fulltextSearch()`](src/vector-store/vector-store.service.ts:103)
- [ ] 2.7 Add helper method to normalize collection names (convert string to array)
- [ ] 2.8 Implement deduplication logic based on document ID

## 3. Update SearchService
- [ ] 3.1 Update [`search()`](src/search/search.service.ts:18) method signature to accept `string | string[]`
- [ ] 3.2 Update [`searchByPayload()`](src/search/search.service.ts:99) method signature to accept `string | string[]`
- [ ] 3.3 Update [`fulltextSearch()`](src/search/search.service.ts:113) method signature to accept `string | string[]`
- [ ] 3.4 Ensure reranking works correctly with multi-collection results
- [ ] 3.5 Verify score normalization across collections

## 4. Add Unit Tests
- [ ] 4.1 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection search
- [ ] 4.2 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection payload search
- [ ] 4.3 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection fulltext search
- [ ] 4.4 Add tests for result deduplication
- [ ] 4.5 Add tests for backward compatibility (single string collection name)
- [ ] 4.6 Add tests for empty collection array validation

## 5. Add E2E Tests
- [ ] 5.1 Add E2E test for semantic search across multiple collections
- [ ] 5.2 Add E2E test for payload search across multiple collections
- [ ] 5.3 Add E2E test for fulltext search across multiple collections
- [ ] 5.4 Add E2E test verifying backward compatibility with single collection
- [ ] 5.5 Add E2E test for error handling with empty collection array

## 6. Documentation
- [ ] 6.1 Update API documentation in controller with multi-collection examples
- [ ] 6.2 Update README.md with multi-collection search usage examples
- [ ] 6.3 Add migration notes for API consumers