# Tasks: Enhance Indexing Capabilities

## Dependencies
- [x] Add `minimatch` and `@types/minimatch` to `package.json` <!-- id: 0 -->

## Implementation
- [x] Update `IndexerService` to include `shouldExclude` helper method using `minimatch` <!-- id: 1 -->
- [x] Refactor `IndexerService.indexRepository` to support exclusion patterns <!-- id: 2 -->
- [x] Implement `IndexerService.indexFiles` to handle selective indexing with exclusion <!-- id: 3 -->
- [x] Update `IndexerController` to accept `excludePatterns` in `POST /index` <!-- id: 4 -->
- [x] Add `POST /indexer/index-files` endpoint to `IndexerController` <!-- id: 5 -->

## Validation
- [x] Add unit tests for `shouldExclude` logic <!-- id: 6 -->
- [x] Add e2e tests for `POST /index` with exclusion patterns <!-- id: 7 -->
- [x] Add e2e tests for `POST /index-files` with and without exclusion <!-- id: 8 -->