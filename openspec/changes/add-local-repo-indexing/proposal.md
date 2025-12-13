# Change: Add Local Repository Indexing

## Why
Currently, the system only supports indexing repositories hosted on GitLab. Developers often want to index local repositories on their machine for private work, testing, or offline development.

## What Changes
- Add a new capability `local-repository-integration` to support reading files from the local filesystem.
- Refactor the indexing logic to abstract the repository source (GitLab vs Local).
- Update the API to accept local directory paths as a source for indexing.

## Impact
- Affected specs: `local-repository-integration` (NEW).
- Affected code: `IndexerService`, `GitLabService`, `IndexRepoDto`.
- New security consideration: File system access validation.
