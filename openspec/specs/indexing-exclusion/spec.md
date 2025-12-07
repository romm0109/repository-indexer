# indexing-exclusion Specification

## Purpose
TBD - created by archiving change enhance-indexing-capabilities. Update Purpose after archive.
## Requirements
### Requirement: Exclude files from indexing based on glob patterns
The system MUST allow users to specify a list of glob patterns to exclude files from the indexing process.

#### Scenario: User excludes node_modules
- **Given** a repository with a `node_modules` directory
- **And** the user sends a request to `POST /indexer/index`
- **And** the request body includes `excludePatterns: ["node_modules/**"]`
- **When** the indexing process runs
- **Then** files within `node_modules` should not be fetched, chunked, or indexed.

#### Scenario: User excludes test files
- **Given** a repository with `.spec.ts` files
- **And** the user sends a request to `POST /indexer/index`
- **And** the request body includes `excludePatterns: ["**/*.spec.ts"]`
- **When** the indexing process runs
- **Then** files ending in `.spec.ts` should not be indexed.

#### Scenario: No exclusion patterns provided
- **Given** a repository with various files
- **And** the user sends a request to `POST /indexer/index` without `excludePatterns`
- **When** the indexing process runs
- **Then** all eligible TypeScript files (as per existing logic) should be indexed.

