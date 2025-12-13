## ADDED Requirements

### Requirement: Local Repository Access

The system MUST be able to read file structure and content from the local filesystem.

#### Scenario: Fetch file list from local directory

- **WHEN** the system requests files from a valid local path
- **THEN** it returns a list of all files in that directory recursively

#### Scenario: Fetch file content from local path

- **WHEN** the system requests content for a specific file path
- **THEN** it returns the text content of the file

### Requirement: Local Path Security

The system MUST restrict local file access to configured allowed directories.

#### Scenario: Access allowed directory

- **WHEN** indexing a path within the configured `ALLOWED_PATHS`
- **THEN** the operation proceeds

#### Scenario: Block forbidden directory

- **WHEN** indexing a path outside the configured `ALLOWED_PATHS`
- **THEN** the operation is rejected with an error

### Requirement: Configuration

The system MUST be configurable via environment variables for local repository access.

#### Scenario: Configure Allowed Paths

- **WHEN** `ALLOWED_LOCAL_PATHS` environment variable is set (comma-separated strings)
- **THEN** only directories starting with these paths are indexable
