# Spec: Query Refinement

## ADDED Requirements

### Requirement: Optional Query Refinement
The system MUST allow users to provide an optional `prompt` field in the search request to generate multiple refined queries using an LLM (Query Expansion).

#### Scenario: User provides a prompt
-   **Given** the search service is configured with a valid refinement model
-   **When** a user sends a POST request to `/search` with `query="auth"` and `prompt="This is a NestJS application using Passport"`
-   **Then** the system should call the refinement model to generate multiple queries (e.g., "NestJS Passport authentication", "Passport strategy implementation", "AuthGuard usage")
-   **And** perform vector search for each generated query
-   **And** aggregate and deduplicate the results from all searches
-   **And** rerank the combined results against the original query "auth"
-   **And** return the top reranked results.

#### Scenario: User does not provide a prompt
-   **Given** the search service is running
-   **When** a user sends a POST request to `/search` with `query="auth"` and no `prompt`
-   **Then** the system should use the original query "auth" for embedding and vector search.

#### Scenario: Refinement service fails
-   **Given** the refinement service is misconfigured or down
-   **When** a user sends a POST request to `/search` with a `prompt`
-   **Then** the system should log the error
-   **And** fallback to using the original query for search
-   **And** return the search results (graceful degradation).

### Requirement: Configuration
The system MUST support configuration for the refinement model via environment variables.

#### Scenario: Configuration variables
-   **Given** the application is starting
-   **Then** it should read `REFINE_URL`, `REFINE_API_KEY`, and `REFINE_MODEL_NAME` from the environment.

### Requirement: API Documentation
The system MUST expose the new `prompt` field in the OpenAPI/Swagger documentation.

#### Scenario: Swagger UI
-   **Given** the application is running
-   **When** a user visits the Swagger UI
-   **Then** the `SearchDto` schema should show `prompt` as an optional string field.