# Proposal: Enhance Indexing Capabilities

## Summary
This proposal introduces two key enhancements to the indexing process: the ability to exclude files using glob patterns and a new endpoint for indexing a specific list of files. These changes provide greater control over what gets indexed, allowing users to skip irrelevant files (like `node_modules` or generated code) and target specific files for updates.

## Motivation
Currently, the `indexer` service fetches and indexes the entire repository tree (filtering only for `.ts`/`.tsx` files). This has two main limitations:
1.  **No Exclusion:** Users cannot exclude specific directories or files (e.g., `node_modules`, `dist`, `**/*.spec.ts`) that might clutter the index or consume unnecessary resources.
2.  **No Selective Indexing:** Users cannot trigger indexing for specific files (e.g., when a file is updated via a webhook). They must re-index the entire repository.

## Proposed Solution
1.  **Exclusion Patterns:** Update the existing `POST /indexer/index` endpoint to accept an optional `excludePatterns` array (e.g., `["node_modules/**", "**/*.test.ts"]`).
2.  **Selective Indexing Endpoint:** Create a new `POST /indexer/index-files` endpoint that accepts a list of file paths to index, along with optional exclusion patterns.

## Dependencies
- Requires adding a glob matching library (e.g., `minimatch`) to `package.json`.

## Risks
- **Performance:** Pattern matching on large file lists might introduce slight overhead, though likely negligible compared to network/embedding latency.
- **Complexity:** The `IndexerService` will need to handle both full-tree fetching and specific file lists, potentially duplicating some logic if not refactored carefully.