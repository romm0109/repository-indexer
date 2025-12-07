## MODIFIED Requirements
### Requirement: Fetch Repository Content
The system MUST be able to fetch the file structure and file contents of a GitLab repository.

#### Scenario: Fetch file list with exclude globs applied by indexer
- WHEN the indexer orchestrates a fetch of repository files
- THEN the raw listing from GitLab is obtained as usual
- AND exclude globs from the API payload are applied by the indexer before any chunking/embedding
- AND files matching any exclude pattern are omitted from downstream processing

#### Scenario: Fetch file content for selected files
- WHEN a client calls POST /indexer/embed-selected with files provided
- THEN the system fetches contents only for those files that are not excluded
- AND files not present in the repository are reported as notFound without failing the whole request