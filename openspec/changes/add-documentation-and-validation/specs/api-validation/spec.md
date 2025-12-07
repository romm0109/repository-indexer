## ADDED Requirements

### Requirement: Request Body Validation
The system SHALL validate all API request bodies against defined schemas using `class-validator`.

#### Scenario: Invalid input rejected
- **WHEN** a client sends a request with missing or invalid fields (e.g., missing required `repoId`)
- **THEN** the API returns a 400 Bad Request error with details about the validation failure

#### Scenario: Valid input accepted
- **WHEN** a client sends a request with valid data conforming to the DTO schema
- **THEN** the API processes the request successfully

### Requirement: Global Validation Pipe
The system SHALL enforce validation globally for all controllers.

#### Scenario: Automatic validation
- **WHEN** a new controller endpoint is added with a DTO
- **THEN** the request body is automatically validated without manual pipe configuration