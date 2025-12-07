# Tasks: Enhance Indexing Capabilities

## Dependencies
- [ ] Add `minimatch` and `@types/minimatch` to `package.json` <!-- id: 0 -->

## Implementation
- [ ] Update `IndexerService` to include `shouldExclude` helper method using `minimatch` <!-- id: 1 -->
- [ ] Refactor `IndexerService.indexRepository` to support exclusion patterns <!-- id: 2 -->
- [ ] Implement `IndexerService.indexFiles` to handle selective indexing with exclusion <!-- id: 3 -->
- [ ] Update `IndexerController` to accept `excludePatterns` in `POST /index` <!-- id: 4 -->
- [ ] Add `POST /indexer/index-files` endpoint to `IndexerController` <!-- id: 5 -->

## Validation
- [ ] Add unit tests for `shouldExclude` logic <!-- id: 6 -->
- [ ] Add e2e tests for `POST /index` with exclusion patterns <!-- id: 7 -->
- [ ] Add e2e tests for `POST /index-files` with and without exclusion <!-- id: 8 -->