## Context
The current `IndexerService` is tightly coupled to `GitLabService`. To support local repositories, we need to decouple the "fetching" logic from the "indexing" logic.

## Goals
- Support indexing of repositories located on the local server filesystem.
- Maintain existing GitLab functionality.
- Ensure security by restricting local access to specific directories.

## Decisions
- **Interface Abstraction**: We will extract an interface (e.g., `RepositoryProvider`) with methods equivalent to `fetchRepositoryTree` and `fetchFileContent`.
- **Strategy Pattern**: `IndexerService` will select the provider based on the request (GitLab ID vs Local Path).
- **Security Check**: Enforce an `ALLOWED_LOCAL_PATHS` configuration to prevent arbitrary file system reads.

## Risks
- **Security**: Exposing file system access via API is high-risk.
  - *Mitigation*: Strictly enforce allow-lists for paths. Reject requests for paths outside these roots.

## Open Questions
- Should we unify the DTO or have separate endpoints? (Decision: Unify DTO with optional fields for now to keep API surface small).
