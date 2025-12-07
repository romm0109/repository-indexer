## MODIFIED Requirements
### Requirement: Metadata Storage
The system MUST store rich metadata with each vector.

#### Scenario: Excluded files produce no vectors
- WHEN indexing runs with exclude globs
- THEN files matching any exclude pattern MUST NOT produce vectors
- AND the vector store contains no entries for excluded file paths

### Requirement: Testing
The vector storage MUST be testable with a local or mocked Qdrant instance.

#### Scenario: Validate counts after filtered embedding
- GIVEN a repository with both included and excluded files
- WHEN embedding completes with exclude patterns applied
- THEN only included files yield stored vectors
- AND test assertions confirm absence of vectors for excluded file paths

## ADDED Requirements
### Requirement: Result accounting for filtered operations
The system MUST provide accounting metadata from storage operations for observability.

#### Scenario: Report processed vs skipped
- WHEN the indexer stores vectors for a filtered set of files
- THEN the system MUST return counts (processedCount, skippedCount, errorCount)
- AND these counts MUST align with the indexer response fields for visibility