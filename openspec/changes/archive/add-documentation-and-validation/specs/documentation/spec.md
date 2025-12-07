## ADDED Requirements

### Requirement: Project Documentation
The project SHALL include a `README.md` file that provides essential information for developers.

#### Scenario: Developer setup
- **WHEN** a developer clones the repository
- **THEN** they can read the `README.md` to understand how to install dependencies and run the project

### Requirement: API Documentation
The project SHALL expose an OpenAPI specification (Swagger UI) to document available API endpoints.

#### Scenario: Accessing Swagger UI
- **WHEN** a user navigates to `/api`
- **THEN** the Swagger UI is displayed, listing all available endpoints and their schemas