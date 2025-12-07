# Tasks — add-embed-exclude-and-selected-files

1) Draft spec deltas
- Create delta specs under changes/add-embed-exclude-and-selected-files/specs.
- Capabilities affected: gitlab-integration, code-chunking, vector-storage, semantic-search, and introduce/confirm indexer-api contract if represented in existing specs.
- Focus deltas on API contract change and orchestration behavior, not on provider internals.

2) Modify Index API contract (spec delta)
- MODIFIED: POST /indexer/index accepts body field exclude: string[].
- Define supported glob semantics and examples (node_modules/**, **/*.min.js, dist/**).
- Validation rules:
  - exclude optional; when empty or omitted, behavior unchanged.
  - Reject non-string items, empty strings, or arrays exceeding a reasonable limit (document limit; impl can decide).
- Behavior:
  - Apply exclude filters at discovery step before chunking/embedding.
  - Excludes win over inclusions from repository enumeration.

3) Add new endpoint (spec delta)
- ADDED: POST /indexer/embed-selected with body { files: string[], exclude?: string[] }.
- Behavior:
  - Only fetch and embed the listed files after applying exclude globs (if provided).
  - Must tolerate duplicates in files; process each unique file once.
  - Must ignore files that do not exist with a recorded error entry; do not fail the entire request.
- Validation rules:
  - files must be non-empty array of unique strings after normalization; empty set is a 400.
  - exclude rules same as Index API; excludes win.

4) Results and error model (spec delta)
- Define a structured response for both endpoints including:
  - processedCount, skippedCount, errorCount
  - arrays: processedFiles[], skippedByExclude[], notFound[], errors[] with per-file reason
  - optional timings: discoveryMs, chunkingMs, embeddingMs, storageMs (non-goal to mandate but allow presence)

5) Scenarios coverage
- Exclude precedence: files listed but excluded should be skippedByExclude.
- Empty exclude: identical behavior to today.
- Multiple exclude patterns: union applied.
- Duplicates in files: deduped; count reflects unique processed files.
- Partial failures: continue processing; errors[] captures per-file details.
- Large inputs: behavior well-defined though performance tuning is non-goal.

6) Design notes
- Recommend a glob engine with ** support (e.g., minimatch-like rules).
- Apply path normalization to forward slashes prior to matching.
- Reuse discovery/filtering logic between endpoints.
- Keep the embedding pipeline and vector storage unchanged.

7) Validation
- Run openspec validate add-embed-exclude-and-selected-files --strict and resolve all warnings/errors.
- Ensure every requirement has at least one Scenario and cross-reference related capabilities.

8) Implementation plan stub (for later apply phase)
- Update IndexerController: extend DTO for /indexer/index and add /indexer/embed-selected.
- Update IndexerService: refactor discovery/filter helpers; integrate exclude filtering.
- Extend tests: e2e for both endpoints, including exclude precedence and partial failures.
- Documentation examples in README (payloads and typical excludes).

9) Acceptance criteria
- Strict validation passes.
- Scenarios document all edge cases listed above.
- Proposal approved by maintainer before apply phase starts.