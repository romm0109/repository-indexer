## ADDED Requirements

### Requirement: Full-Text Search
The system MUST allow users to search the indexed codebase using exact or partial text matching on the stored code content.

#### Scenario: Search by Text Query
- **WHEN** a user submits a text query to the full-text search endpoint
- **THEN** the system returns code chunks where the `text` field contains the query string

#### Scenario: Search with Payload Filters
- **WHEN** a user submits a text query with optional payload filters (e.g., file path pattern, repository name)
- **THEN** the system returns only code chunks that match both the text query and the payload filters

#### Scenario: Empty Results
- **WHEN** a user submits a text query that matches no indexed content
- **THEN** the system returns an empty result set

### Requirement: Full-Text Search API
The system MUST expose a `POST /search/fulltext` endpoint for full-text search operations.

#### Scenario: Valid Request
- **WHEN** a valid request is sent with `textQuery` and `collectionName`
- **THEN** the system returns matching results with status 200

#### Scenario: Request with Filters
- **WHEN** a valid request includes optional `payload` filters
- **THEN** the system applies both text matching and payload filtering to narrow results

#### Scenario: Invalid Request
- **WHEN** a request is missing required fields (`textQuery` or `collectionName`)
- **THEN** the system returns a 400 Bad Request error with validation details