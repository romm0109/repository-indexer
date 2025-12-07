# Spec: Code Chunking

## ADDED Requirements

### Requirement: AST-Based Chunking
The system MUST chunk TypeScript/TSX files based on AST nodes (symbols).

#### Scenario: Chunk Function Declaration
Given a TypeScript file with a top-level function declaration
When the file is chunked
Then the function should be extracted as a single chunk including its signature, body, and preceding comments

#### Scenario: Chunk Class Declaration
Given a TypeScript file with a class declaration
When the file is chunked
Then the class should be extracted as a chunk

### Requirement: Size-Aware Splitting
The system MUST split large symbols that exceed a configured token limit.

#### Scenario: Split Large Function
Given a function that exceeds `MAX_TOKENS`
When the function is chunked
Then it should be split into multiple sub-chunks based on logical boundaries (blocks, blank lines)
And each sub-chunk should include the function header context

### Requirement: Small Symbol Grouping
The system MUST group small symbols to avoid noise.

#### Scenario: Group Small Helpers
Given multiple consecutive small functions (under `MIN_TOKENS`)
When the file is chunked
Then they should be grouped into a single "region" chunk

### Requirement: Testing
The chunking logic MUST be verifiable via unit tests.

#### Scenario: Test Chunking Logic
Given a set of sample TypeScript/TSX files covering all edge cases (large files, small symbols, various declarations)
When the chunker processes them
Then the output chunks should match the expected snapshots