# selective-indexing Specification

## Purpose
TBD - created by archiving change enhance-indexing-capabilities. Update Purpose after archive.
## Requirements
### Requirement: Index specific list of files
The system MUST provide an endpoint to index a specific list of files, rather than the entire repository.

#### Scenario: User indexes specific files
- **Given** a list of file paths `["src/main.ts", "src/utils.ts"]`
- **When** the user sends a request to `POST /indexer/index-files` with this list
- **Then** only `src/main.ts` and `src/utils.ts` should be fetched, chunked, and indexed.
- **And** the system should not attempt to fetch the repository tree.

#### Scenario: User indexes specific files with exclusion
- **Given** a list of file paths `["src/main.ts", "src/test.spec.ts"]`
- **And** an exclusion pattern `["**/*.spec.ts"]`
- **When** the user sends a request to `POST /indexer/index-files` with these parameters
- **Then** only `src/main.ts` should be indexed.
- **And** `src/test.spec.ts` should be ignored.

#### Scenario: Invalid file paths
- **Given** a list of file paths containing a non-existent file
- **When** the user sends a request to `POST /indexer/index-files`
- **Then** the system should attempt to process valid files
- **And** log an error or warning for the non-existent file (depending on implementation, but shouldn't crash).

