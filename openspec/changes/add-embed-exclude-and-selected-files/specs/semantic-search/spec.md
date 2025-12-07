## MODIFIED Requirements
### Requirement: Semantic Search
The system MUST allow users to search the indexed codebase using natural language queries.

#### Scenario: Search by Query (unchanged behavior)
- WHEN a natural language query is provided
- THEN the system returns semantically relevant results from the indexed corpus

#### Scenario: Respect excluded content during search
- WHEN indexing is performed with exclude globs
- THEN content matching exclude patterns is NOT present in the vector store
- AND search results MUST NOT include chunks from excluded files

## ADDED Requirements
### Requirement: Targeted embedding of selected files
The system MUST support embedding only a caller-provided subset of files.

#### Scenario: Embed selected files only
- WHEN a client calls POST /indexer/embed-selected with { files: [pathA, pathB] }
- THEN only content from pathA and pathB is embedded and stored
- AND no other files are processed

#### Scenario: Apply exclude patterns to selected files
- WHEN a client provides exclude globs alongside files
- THEN files matching any exclude pattern are skipped
- AND skipped files are reported in the response

#### Scenario: Partial failures do not abort
- WHEN some selected files fail to embed
- THEN remaining valid files are still embedded
- AND the response includes per-file errors and counts
