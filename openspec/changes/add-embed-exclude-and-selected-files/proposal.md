# OpenSpec: Proposal — add-embed-exclude-and-selected-files

## Summary
Extend the indexing API to support excluding files via glob patterns and introduce a new endpoint that embeds only a caller-provided subset of files (with optional excludes). This enables:
- Finer control over repository indexing by skipping paths like node_modules/**, dist/**, or generated files.
- Targeted re-embedding of specific files, avoiding a full repository pass.

## Goals
- Modify POST /indexer/index to accept exclude: string[] that supports glob patterns (e.g., node_modules/**, **/*.min.js).
- Add POST /indexer/embed-selected that accepts { files: string[], exclude?: string[] }:
  - Only fetch and embed the listed files (after applying excludes if provided).
- Keep behavior backwards compatible when exclude is omitted.
- Define validation, precedence rules, and clear error handling around files and excludes.

## Non-Goals
- Implement support for include syntax beyond the required files list and exclude globs.
- Change existing chunking, embedding model selection, reranking, or storage semantics.
- Add new auth, long-running orchestration, job queues, or webhooks.

## Context
The current specs cover GitLab fetching, AST-based chunking, vector storage, and semantic search. Extending the indexer’s contract maintains the existing flow but adds filtering controls:
- Excludes allow efficient skipping of non-source or large generated content.
- Selected-files endpoint supports incremental updates and targeted reindexing.

## Open Questions
- Glob engine specifics: Should we standardize on a minimatch-like syntax? (Assume common double-star semantics.)
- Maximum number of files in files array for embed-selected (sensible limits may be required but can be addressed in impl).
- Behavior when both files and exclude globs overlap: files take precedence or excludes win? (Proposal: excludes win for safety/performance.)

## Risks & Mitigations
- Risk: Misconfigured excludes skip important code.
  - Mitigation: Return counts and summaries of skipped vs processed; add validation and examples.
- Risk: Performance hit from glob matching on large repos.
  - Mitigation: Use efficient matcher and apply filtering early during discovery.
- Risk: Partial failures when some files are missing or invalid.
  - Mitigation: Document per-file error handling and return structured result with successes/failures.

## Validation Plan
- Strictly validate the change with openspec validate add-embed-exclude-and-selected-files --strict.
- Add comprehensive scenarios for exclude precedence, empty arrays, duplicates, and partial failures.
- Align naming with existing modules: Indexer controller/service orchestrates GitLab fetch, chunking, embedding, and vector storage.

## Timeline
- Spec proposal & validation.
- Implementation guarded by feature tests.
- Optional iterations to extend glob examples and error payload details.
