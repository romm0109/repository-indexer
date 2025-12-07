# vector-storage Specification

## Purpose
TBD - created by archiving change index-gitlab-repo. Update Purpose after archive.
## Requirements
### Requirement: Qdrant Integration
The system MUST be able to store and retrieve vectors from Qdrant.

#### Scenario: Store Embedding
Given a text chunk and its vector embedding
When the system stores it
Then it should be persisted in the configured Qdrant collection with associated metadata

### Requirement: Metadata Storage
The system MUST store rich metadata with each vector.

#### Scenario: Store Metadata
Given a chunk with metadata (repo, file path, symbol name, start/end line)
When the chunk is stored
Then the metadata should be queryable in Qdrant

### Requirement: Configuration
The system MUST be configurable via environment variables for Qdrant access.

#### Scenario: Configure Qdrant
Given `QDRANT_URL` and `QDRANT_API_KEY` environment variables
When the service initializes
Then it should connect to the specified Qdrant instance

### Requirement: Testing
The vector storage MUST be testable with a local or mocked Qdrant instance.

#### Scenario: Integration Test
Given a running local Qdrant instance (e.g., via Docker)
When vectors are upserted and then queried
Then the retrieved vectors should match the stored ones

