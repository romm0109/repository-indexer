# Design — add-embed-exclude-and-selected-files

## Overview
We extend indexing capabilities with:
1) Exclude globs on POST /indexer/index to skip paths (e.g., node_modules/**, dist/**, **/*.min.js).
2) New POST /indexer/embed-selected that embeds only caller-specified files, with optional exclude globs applied first.

The intent is to keep the pipeline (fetch → chunk → embed → store) unchanged while adding pre-filtering for which files enter the pipeline.

## Architecture Touchpoints
- IndexerController and IndexerService orchestrate the pipeline.
- GitLab integration remains the source for file listing and file content fetching.
- Chunking, embedding, vector storage modules are unchanged; we only reduce their input set.

## File Discovery and Filtering
- /indexer/index: discovery is repository-driven (existing behavior). After enumerating files, apply exclude globs to form the final working set.
- /indexer/embed-selected: discovery is caller-driven. Client provides files: string[]. Normalize, dedupe, then apply exclude globs to the provided list only.
- Excludes win: if a file matches any exclude glob, it is skipped even if explicitly listed in files.

## Glob Matching Semantics
- Use a minimatch-like engine with support for:
  - ** wildcard across path segments (e.g., node_modules/**)
  - * for segment-level wildcard
  - ? for single-character wildcard
- Normalize all paths to forward slashes before matching.
- Apply all patterns as a union: a file excluded by any pattern is skipped.

## Path Model
- All file paths are repository-relative.
- Leading slashes are accepted but normalized by stripping to ensure repository-relative matching.
- All path separators are normalized to forward slashes prior to any processing.

## Validation Rules
- exclude?: string[]
  - Optional; if missing or empty, behavior remains as-is.
  - Reject non-string entries or empty-string patterns with 400 Bad Request (spec to define precise error fields).
- files: string[] (embed-selected only)
  - Required and must have at least one valid path after normalization and trimming.
  - Deduplicate after normalization; if the resulting set is empty, return 400.
  - Invalid entries (non-strings) produce 400.

## Result Shape (Both Endpoints)
- processedCount: number
- skippedCount: number
- errorCount: number
- processedFiles: string[] (normalized relative paths)
- skippedByExclude: string[] (subset of discovered or provided files)
- notFound: string[] (embed-selected only; files not found at source)
- errors: { file: string, reason: string }[]
- Optional timings (for observability, not required by spec): discoveryMs, chunkingMs, embeddingMs, storageMs

## Error Handling
- Partial failures do not abort the entire request. Continue processing remaining files.
- Record per-file issues in errors[] and increment errorCount.
- For embed-selected, if a file is not present in the source provider (e.g., GitLab), add to notFound[] and continue.

## Performance Considerations
- Apply excludes early—before chunking/embedding—to minimize work.
- Keep glob compilation cached per-request to reduce repeated matcher overhead on large sets.
- Avoid changing concurrency; any batching/parallelism remains as currently implemented.

## Reuse and Abstraction
- Introduce a shared filtering utility:
  - normalizePaths(paths: string[]): string[]
  - applyExclude(paths: string[], patterns: string[]): { kept: string[], skipped: string[] }
  - dedupe(paths: string[]): string[]
- Keep this logic within IndexerService or a small helper module reused by both endpoints.

## Security & Limits
- No maximum payload sizes are enforced by spec.
- No changes to auth or tokens; reuse current mechanism.

## Backward Compatibility
- /indexer/index without exclude behaves identically to current behavior.
- New endpoint is additive; no breaking changes.

## Testing Strategy
- Unit: filtering utility with path normalization and glob variations.
- E2E:
  - /indexer/index with excludes vs without excludes.
  - /indexer/embed-selected with: valid files; includes duplicates; includes files matching exclude; includes non-existent files; empty or invalid payloads.
- Validate structured responses and counts.

## Open Questions (resolved)
- Excludes path basis: repository-relative (leading slashes stripped).
- Maximum payload sizes: not enforced by spec.