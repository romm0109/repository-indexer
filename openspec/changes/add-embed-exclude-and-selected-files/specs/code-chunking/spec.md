## MODIFIED Requirements
### Requirement: AST-Based Chunking
The system MUST chunk TypeScript/TSX files based on AST nodes (symbols).

#### Scenario: Chunking operates only on filtered input set
- WHEN files are filtered by exclude globs or by selected-files semantics before chunking
- THEN the chunker processes only the remaining (kept) files
- AND files skipped by exclude patterns or not provided in selected-files are never passed to the chunker

### Requirement: Size-Aware Splitting
The system MUST split large symbols that exceed a configured token limit.

#### Scenario: Unchanged splitting behavior on filtered inputs
- WHEN chunking is executed on the filtered input set
- THEN size-aware splitting applies as before without any changes to thresholds or grouping

### Requirement: Small Symbol Grouping
The system MUST group small symbols to avoid noise.

#### Scenario: Unchanged grouping behavior on filtered inputs
- WHEN small symbols are present in the filtered inputs
- THEN grouping is applied as before, independent of exclude rules

### Requirement: Testing
The chunking logic MUST be verifiable via unit tests.

#### Scenario: Test that excluded files are not chunked
- GIVEN a set of files where some match exclude patterns
- WHEN filtering is applied before chunking
- THEN the chunker receives no content for excluded files
- AND unit tests verify zero invocations on excluded file paths