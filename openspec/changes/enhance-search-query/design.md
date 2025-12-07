# Design: Search Query Refinement

## Architecture
The solution involves enhancing the `SearchService` to conditionally interact with an LLM provider (OpenAI-compatible) before performing the vector search.

### Components
1.  **SearchController**: Receives the `prompt` in the request body.
2.  **SearchService**:
    -   Checks if `prompt` is provided.
    -   If yes, constructs a prompt for the LLM that includes the user's `prompt` (context) and the original `query`.
    -   Calls the LLM to get a list of refined queries (Query Expansion).
    -   Iterates through each generated query to perform vector search.
    -   Aggregates and deduplicates all retrieved documents.
    -   Reranks the combined document set against the *original* user query.
3.  **LLM Integration**:
    -   We can potentially reuse `EmbeddingService`'s OpenAI client if the base URL and API key are the same, but it's safer and more flexible to have a dedicated configuration for the "Chat" or "Refinement" model, as it might use a different model (e.g., `gpt-4o-mini` vs `text-embedding-3-small`) or provider.
    -   We will introduce a new `QueryRefinementService` or add methods to `SearchService` to handle this. Given the scope, adding a private method or a small helper class within `SearchModule` seems appropriate. Let's create a `QueryRefinementService` to keep `SearchService` clean and follow the Single Responsibility Principle.

### Configuration
New environment variables:
-   `REFINE_URL`: Base URL for the refinement model (optional, defaults to OpenAI).
-   `REFINE_API_KEY`: API Key for the refinement model.
-   `REFINE_MODEL_NAME`: Model name (e.g., `gpt-4o-mini`).

### Data Flow
1.  **Request**: `POST /search { query: "auth logic", prompt: "This is a NestJS app using JWT" }`
2.  **Refinement**:
    -   System Prompt: "You are an expert software engineer. The user is searching a codebase. Use the provided context to generate 3-5 specific and effective search queries based on the user's original query. Output the queries as a JSON array of strings."
    -   User Input: "Context: This is a NestJS app using JWT. Query: auth logic"
    -   LLM Output: `["NestJS JWT authentication strategy", "Passport JWT implementation NestJS", "AuthGuard JWT NestJS"]`
3.  **Search**:
    -   Embed each generated query.
    -   Perform vector search for each.
    -   Collect all results (e.g., 3 queries * 10 results = 30 potential docs).
4.  **Deduplication**: Remove duplicate documents based on ID or content hash.
5.  **Rerank**: Rerank the unique documents against the original query "auth logic".
6.  **Response**: Return top reranked results.

## Trade-offs
-   **New Service vs. Existing**: Creating a `QueryRefinementService` adds boilerplate but isolates the LLM logic from the core search orchestration.
-   **Configuration**: Reusing embedding config vs. new config. New config is chosen for flexibility.

## Security
-   API Keys for the refinement service must be handled securely via environment variables.
-   Prompt injection: The user's prompt is treated as context. We should ensure the system prompt is robust against instructions to ignore previous instructions, although the risk is low for a search refinement tool.