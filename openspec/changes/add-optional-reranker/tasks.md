# Tasks: Add Optional Reranker

1.  [ ] **Update Configuration**: Add `reranker` configuration object to `src/config/configuration.ts` with `url`, `apiKey`, and `modelName`.
2.  [ ] **Create Reranker Module**: Scaffold `src/reranker/reranker.module.ts` and `src/reranker/reranker.service.ts`.
3.  [ ] **Implement Reranker Service**: Implement `rerank` method in `RerankerService` to call the configured reranker API.
4.  [ ] **Update Search Service**: Inject `RerankerService` into `SearchService` and call `rerank` if enabled.
5.  [ ] **Add Unit Tests**: Add unit tests for `RerankerService` and updated `SearchService`.
6.  [ ] **Verify**: Run manual verification or E2E test to ensure search works with and without reranker config.