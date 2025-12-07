## ADDED Requirements

### Requirement: Multi-Collection Search
The system MUST allow users to search across multiple collections in a single query.

#### Scenario: Search Multiple Collections
- **WHEN** a user provides multiple collection names
- **THEN** the system searches all specified collections
- **AND** aggregates results from all collections
- **AND** deduplicates results by document ID
- **AND** returns unified results sorted by relevance score

#### Scenario: Backward Compatibility
- **WHEN** a user provides a single collection name as a string
- **THEN** the system searches only that collection
- **AND** maintains existing behavior

#### Scenario: Empty Collection List
- **WHEN** a user provides an empty array of collection names
- **THEN** the system returns a validation error

### Requirement: Multi-Collection Payload Search
The system MUST support payload-based filtering across multiple collections.

#### Scenario: Filter Across Collections
- **WHEN** a user searches multiple collections with payload filters
- **THEN** the system applies filters to all specified collections
- **AND** returns matching results from all collections

### Requirement: Multi-Collection Full-Text Search
The system MUST support full-text search across multiple collections.

#### Scenario: Full-Text Search Multiple Collections
- **WHEN** a user performs full-text search across multiple collections
- **THEN** the system searches text content in all specified collections
- **AND** optionally applies payload filters to all collections
- **AND** returns aggregated results