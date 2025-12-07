# Implementation Tasks

## 1. Update DTOs
- [x] 1.1 Modify [`SearchDto.collectionName`](src/search/dto/search.dto.ts:11) to accept `string | string[]`
- [x] 1.2 Modify [`PayloadSearchDto.collectionName`](src/search/dto/search.dto.ts:26) to accept `string | string[]`
- [x] 1.3 Modify [`FulltextSearchDto.collectionName`](src/search/dto/search.dto.ts:44) to accept `string | string[]`
- [x] 1.4 Add validation decorators to ensure at least one collection name is provided
- [x] 1.5 Update API documentation with examples for both single and multiple collections

## 2. Update VectorStoreService
- [x] 2.1 Modify [`search()`](src/vector-store/vector-store.service.ts:57) to accept `string | string[]` for collectionName
- [x] 2.2 Implement collection iteration and result aggregation in [`search()`](src/vector-store/vector-store.service.ts:57)
- [x] 2.3 Modify [`searchByPayload()`](src/vector-store/vector-store.service.ts:73) to accept `string | string[]` for collectionName
- [x] 2.4 Implement collection iteration and result aggregation in [`searchByPayload()`](src/vector-store/vector-store.service.ts:73)
- [x] 2.5 Modify [`fulltextSearch()`](src/vector-store/vector-store.service.ts:103) to accept `string | string[]` for collectionName
- [x] 2.6 Implement collection iteration and result aggregation in [`fulltextSearch()`](src/vector-store/vector-store.service.ts:103)
- [x] 2.7 Add helper method to normalize collection names (convert string to array)
- [x] 2.8 Implement deduplication logic based on document ID

## 3. Update SearchService
- [x] 3.1 Update [`search()`](src/search/search.service.ts:18) method signature to accept `string | string[]`
- [x] 3.2 Update [`searchByPayload()`](src/search/search.service.ts:99) method signature to accept `string | string[]`
- [x] 3.3 Update [`fulltextSearch()`](src/search/search.service.ts:113) method signature to accept `string | string[]`
- [x] 3.4 Ensure reranking works correctly with multi-collection results
- [x] 3.5 Verify score normalization across collections

## 4. Add Unit Tests
- [x] 4.1 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection search
- [x] 4.2 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection payload search
- [x] 4.3 Add tests for [`VectorStoreService`](src/vector-store/vector-store.service.ts:6) multi-collection fulltext search
- [x] 4.4 Add tests for result deduplication
- [x] 4.5 Add tests for backward compatibility (single string collection name)
- [x] 4.6 Add tests for empty collection array validation

## 5. Add E2E Tests
- [x] 5.1 Add E2E test for semantic search across multiple collections
- [x] 5.2 Add E2E test for payload search across multiple collections
- [x] 5.3 Add E2E test for fulltext search across multiple collections
- [x] 5.4 Add E2E test verifying backward compatibility with single collection
- [x] 5.5 Add E2E test for error handling with empty collection array

## 6. Documentation
- [x] 6.1 Update API documentation in controller with multi-collection examples
- [x] 6.2 Update README.md with multi-collection search usage examples
- [x] 6.3 Add migration notes for API consumers