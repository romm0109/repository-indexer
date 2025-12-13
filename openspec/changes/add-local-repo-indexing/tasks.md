## 1. Core Implementation

- [x] 1.1 Create `RepositorySource` interface with methods `fetchFiles` and `fetchContent`.
- [x] 1.2 Refactor `GitLabService` to implement `RepositorySource`.
- [x] 1.3 Implement `LocalRepoService` implementing `RepositorySource`.
- [x] 1.4 Refactor `IndexerService` to use `RepositorySource` strategy based on input.
- [x] 1.5 Update `IndexRepoDto` to include `path` and `type` fields.
- [x] 1.6 Implement secure path validation for local indexing (allow-lists).

## 2. Testing

- [x] 2.1 Add unit tests for `LocalRepoService`.
- [x] 2.2 Add e2e tests for local repository indexing.
