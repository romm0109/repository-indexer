# Tasks: Enhance Search Query

1.  **Update Configuration**
    -   [ ] Add `refine` configuration object to `src/config/configuration.ts` mapping to `REFINE_URL`, `REFINE_API_KEY`, `REFINE_MODEL_NAME`.
    -   [ ] Add validation/defaults for these values.

2.  **Create Query Refinement Service**
    -   [ ] Create `src/search/query-refinement.service.ts`.
    -   [ ] Implement `refineQuery(query: string, prompt: string): Promise<string[]>`.
    -   [ ] Use `openai` library to call the chat completion API to generate multiple queries.
    -   [ ] Handle errors and return original query (as single item array) on failure.

3.  **Update Search Module**
    -   [ ] Register `QueryRefinementService` in `src/search/search.module.ts`.
    -   [ ] Inject `QueryRefinementService` into `SearchService`.

4.  **Update Search Logic**
    -   [ ] Update `SearchDto` in `src/search/dto/search.dto.ts` to include optional `prompt`.
    -   [ ] Update `SearchService.search` to call `refineQuery` if `prompt` is present.
    -   [ ] Implement loop to search for each generated query.
    -   [ ] Implement deduplication of results.
    -   [ ] Ensure reranking uses the *original* query against the combined results.

5.  **Documentation**
    -   [ ] Update `README.md` with new environment variables and feature description.
    -   [ ] Verify Swagger docs update automatically via DTO decorators.

6.  **Validation**
    -   [ ] Add unit tests for `QueryRefinementService`.
    -   [ ] Add e2e test for `/search` with `prompt`.