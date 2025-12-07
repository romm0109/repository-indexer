## ADDED Requirements

### Requirement: MCP Server Initialization
The system MUST initialize an MCP server alongside the HTTP server when MCP is enabled via configuration.

#### Scenario: MCP Server Starts Successfully
- **WHEN** the application starts with `MCP_ENABLED=true`
- **THEN** the MCP server SHALL initialize on stdio transport
- **AND** the HTTP server SHALL continue to operate normally

#### Scenario: MCP Server Disabled
- **WHEN** the application starts with `MCP_ENABLED=false`
- **THEN** the MCP server SHALL NOT initialize
- **AND** only the HTTP server SHALL be available

### Requirement: Tool Discovery
The system MUST expose all search capabilities as discoverable MCP tools.

#### Scenario: List Available Tools
- **WHEN** an MCP client requests the list of available tools
- **THEN** the server SHALL return three tools:
  - `search_code_semantic` for semantic vector search
  - `search_code_fulltext` for full-text search
  - `search_code_by_payload` for metadata-based search
- **AND** each tool SHALL include a complete schema with required and optional parameters

### Requirement: Semantic Search Tool
The system MUST provide a `search_code_semantic` tool that performs semantic search using vector embeddings.

#### Scenario: Execute Semantic Search
- **WHEN** an MCP client calls `search_code_semantic` with parameters:
  - `query` (required): natural language search query
  - `prompt` (optional): context for query refinement
  - `top_k` (optional): number of results to return (default: 10)
- **THEN** the tool SHALL use the collection name(s) provided during client initialization
- **AND** invoke the existing search service with the query and client's collection(s)
- **AND** return results with score and code snippet payload
- **AND** apply reranking if enabled

#### Scenario: Semantic Search with Invalid Parameters
- **WHEN** an MCP client calls `search_code_semantic` with missing required parameters
- **THEN** the tool SHALL return an MCP error with code -32602 (Invalid params)
- **AND** include a descriptive error message

#### Scenario: Semantic Search without Collection Initialization
- **WHEN** an MCP client connects without providing collection initialization arguments
- **THEN** tool calls SHALL return an MCP error with code -32603 (Internal error)
- **AND** include a message indicating collection must be specified during client initialization

### Requirement: Full-Text Search Tool
The system MUST provide a `search_code_fulltext` tool that performs exact or partial text matching.

#### Scenario: Execute Full-Text Search
- **WHEN** an MCP client calls `search_code_fulltext` with parameters:
  - `textQuery` (required): text to search for in code content
  - `payload` (optional): filters to narrow results
  - `top_k` (optional): number of results to return (default: 10)
- **THEN** the tool SHALL use the collection name(s) provided during client initialization
- **AND** invoke the existing full-text search service
- **AND** return matching code snippets with metadata

#### Scenario: Full-Text Search with Payload Filters
- **WHEN** an MCP client calls `search_code_fulltext` with payload filters like `{"language": "typescript"}`
- **THEN** the tool SHALL apply the filters to narrow results
- **AND** use the collection name(s) from client initialization
- **AND** return only code snippets matching both text query and filters

### Requirement: Payload Search Tool
The system MUST provide a `search_code_by_payload` tool that searches by metadata filters only.

#### Scenario: Execute Payload Search
- **WHEN** an MCP client calls `search_code_by_payload` with parameters:
  - `payload` (required): metadata filters to match
  - `top_k` (optional): number of results to return (default: 10)
- **THEN** the tool SHALL use the collection name(s) provided during client initialization
- **AND** invoke the existing payload search service
- **AND** return code snippets matching the metadata filters

#### Scenario: Search by File Path Pattern
- **WHEN** an MCP client calls `search_code_by_payload` with `{"filePath": "/src/search/*"}`
- **THEN** the tool SHALL use the collection name(s) from client initialization
- **AND** return all indexed code from files matching the path pattern

### Requirement: Error Handling
The system MUST map service exceptions to appropriate MCP error responses.

#### Scenario: Service Error During Tool Execution
- **WHEN** a tool execution encounters a service error
- **THEN** the MCP server SHALL return a JSON-RPC 2.0 error response
- **AND** use appropriate error codes:
  - -32602 for invalid parameters
  - -32001 for resource not found
  - -32603 for internal errors
- **AND** include the original error message in the error response

### Requirement: Graceful Shutdown
The system MUST gracefully shut down both HTTP and MCP servers when the application terminates.

#### Scenario: Application Shutdown
- **WHEN** the application receives a shutdown signal
- **THEN** the MCP server SHALL close all active connections
- **AND** the HTTP server SHALL complete in-flight requests
- **AND** both servers SHALL shut down cleanly

### Requirement: Configuration
The system MUST support configuration of MCP server behavior via environment variables and client initialization arguments.

#### Scenario: Configure MCP Server
- **WHEN** the application reads configuration
- **THEN** it SHALL support the following environment variables:
  - `MCP_ENABLED`: enable/disable MCP server (default: false)
  - `MCP_TRANSPORT`: transport type (default: stdio)
  - `MCP_SERVER_NAME`: server name for MCP clients (default: code-indexer)
  - `MCP_SERVER_VERSION`: server version (default: from package.json)

#### Scenario: Client Initializes with Single Collection
- **WHEN** an MCP client connects with initialization argument `--collection my-repo`
- **THEN** all tools for that client SHALL search only the "my-repo" collection

#### Scenario: Client Initializes with Multiple Collections
- **WHEN** an MCP client connects with initialization argument `--collections repo1,repo2,repo3`
- **THEN** all tools for that client SHALL search across "repo1", "repo2", and "repo3" collections

#### Scenario: Client Connects without Collection Arguments
- **WHEN** an MCP client connects without `--collection` or `--collections` arguments
- **THEN** tool calls from that client SHALL return an error
- **AND** the error SHALL indicate that collection must be specified during initialization

#### Scenario: Multiple Clients with Different Collections
- **WHEN** multiple MCP clients connect to the same server with different collection arguments
- **THEN** each client SHALL search only their specified collection(s)
- **AND** clients SHALL NOT interfere with each other's collection configuration

### Requirement: Testing
The MCP server functionality MUST be verifiable via unit and integration tests.

#### Scenario: Unit Test Tool Handlers
- **WHEN** unit tests execute tool handlers
- **THEN** they SHALL verify correct parameter validation
- **AND** verify correct service method invocation
- **AND** verify correct response formatting

#### Scenario: Integration Test MCP Protocol
- **WHEN** integration tests simulate MCP client requests
- **THEN** they SHALL verify tool discovery works correctly
- **AND** verify tool execution returns expected results
- **AND** verify error handling produces correct MCP error responses