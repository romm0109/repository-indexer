# Code Indexer

A semantic search engine for GitLab repositories, built with NestJS, Qdrant, and OpenAI.

## Overview

This project indexes source code from GitLab repositories into a vector database (Qdrant) to enable semantic search capabilities. It supports:
- Indexing GitLab repositories (with selective indexing and exclusion rules).
- Code chunking and embedding using OpenAI models.
- Semantic search over indexed code.
- Reranking of search results for better relevance.

## Prerequisites

- Node.js (v18 or later)
- Docker (for running Qdrant)
- OpenAI API Key
- GitLab Access Token (if indexing private repositories)

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd code-indexer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and configure the following:

    ```env
    # App
    PORT=3000

    # GitLab
    GITLAB_URL=https://gitlab.com
    GITLAB_TOKEN=your_gitlab_token

    # OpenAI
    OPENAI_API_KEY=your_openai_api_key

    # Qdrant
    QDRANT_URL=http://localhost:6333
    QDRANT_API_KEY=your_qdrant_api_key # Optional

    # Query Refinement (Optional)
    REFINE_URL=https://api.openai.com/v1 # Or other compatible provider
    REFINE_API_KEY=your_openai_api_key
    REFINE_MODEL_NAME=gpt-4o-mini

    # MCP Server (Optional)
    MCP_ENABLED=false
    MCP_TRANSPORT=stdio
    MCP_SERVER_NAME=code-indexer
    MCP_SERVER_VERSION=1.0.0
    ```

4.  **Run Qdrant:**
    ```bash
    docker run -p 6333:6333 -p 6334:6334 \
        -v $(pwd)/qdrant_storage:/qdrant/storage:z \
        qdrant/qdrant
    ```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation

Once the application is running, you can access the Swagger UI documentation at:

http://localhost:3000/api

## Key Features

- **Indexer**: Fetches files from GitLab, chunks them, and stores embeddings.
- **Semantic Search**: Queries the vector store using embeddings and returns relevant code snippets.
- **Multi-Collection Search**: Search across multiple collections (repositories/projects) in a single query.
- **Full-Text Search**: Search for exact or partial text matches within indexed code content.
- **Query Refinement**: Optionally expands search queries using an LLM to improve recall.
- **Reranker**: Improves search results using a reranking model.
- **MCP Server**: Model Context Protocol server for AI assistant integration (Claude Desktop, Cline, etc.).

## API Endpoints

### Search Endpoints

#### POST /search
Semantic search using vector embeddings. Supports searching across single or multiple collections.

**Request Body (Single Collection):**
```json
{
  "query": "authentication function",
  "collectionName": "my-repo",
  "prompt": "string (optional)",
  "top_k": 10
}
```

**Request Body (Multiple Collections):**
```json
{
  "query": "authentication function",
  "collectionName": ["repo1", "repo2", "repo3"],
  "prompt": "string (optional)",
  "top_k": 10
}
```

**Parameters:**
- `query` (required): The search query
- `collectionName` (required): Single collection name (string) or multiple collection names (array of strings)
- `prompt` (optional): Additional context to refine the search query
- `top_k` (optional): Number of results to return (default: 10)

**Response:**
```json
[
  {
    "score": 0.95,
    "text": "function authenticate(user) { ... }",
    "filePath": "/src/auth.ts",
    "language": "typescript"
  }
]
```

**Note:** When searching multiple collections, results are automatically deduplicated by document ID, keeping the highest-scoring version of each document.

#### POST /search/fulltext
Full-text search for exact or partial text matches within indexed code content. Supports searching across single or multiple collections.

**Request Body (Single Collection):**
```json
{
  "textQuery": "function hello",
  "collectionName": "my-repo",
  "payload": {
    "language": "typescript",
    "filePath": "/src/*"
  },
  "top_k": 10
}
```

**Request Body (Multiple Collections):**
```json
{
  "textQuery": "function hello",
  "collectionName": ["repo1", "repo2", "repo3"],
  "payload": {
    "language": "typescript"
  },
  "top_k": 10
}
```

**Parameters:**
- `textQuery` (required): The text to search for in code content
- `collectionName` (required): Single collection name (string) or multiple collection names (array of strings)
- `payload` (optional): Filters to narrow results (e.g., by file path, repository, language)
- `top_k` (optional): Number of results to return (default: 10)

**Response:**
```json
[
  {
    "id": "1",
    "text": "function hello() { console.log('world'); }",
    "filePath": "/src/main.ts",
    "language": "typescript",
    "repository": "repo1"
  }
]
```

**Note:** When searching multiple collections, results are automatically deduplicated by document ID.

#### POST /search/payload
Search by payload filters only (without text matching). Supports searching across single or multiple collections.

**Request Body (Single Collection):**
```json
{
  "collectionName": "my-repo",
  "payload": {
    "filePath": "/src/utils.ts"
  },
  "top_k": 10
}
```

**Request Body (Multiple Collections):**
```json
{
  "collectionName": ["repo1", "repo2", "repo3"],
  "payload": {
    "language": "typescript",
    "repository": "my-org"
  },
  "top_k": 10
}
```

**Parameters:**
- `collectionName` (required): Single collection name (string) or multiple collection names (array of strings)
- `payload` (required): Metadata filters to match (e.g., filePath, language, repository)
- `top_k` (optional): Number of results to return (default: 10)

**Response:**
```json
[
  {
    "id": "1",
    "text": "export function utility() { ... }",
    "filePath": "/src/utils.ts",
    "language": "typescript"
  }
]
```

**Note:** When searching multiple collections, results are automatically deduplicated by document ID.

## MCP Server Integration

The code-indexer service can function as a Model Context Protocol (MCP) server, allowing AI assistants like Claude Desktop, Cline, and other MCP-compatible clients to directly search your indexed codebase.

### What is MCP?

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). By running code-indexer as an MCP server, AI assistants can seamlessly query your codebase without requiring custom integration code.

### Enabling MCP Server

To enable the MCP server, set the following environment variable:

```env
MCP_ENABLED=true
```

The MCP server runs alongside the HTTP API with zero impact on existing functionality. When disabled (default), the MCP module is not loaded at all.

### Configuration

MCP server settings are configured via environment variables:

```env
# Enable/disable MCP server (default: false)
MCP_ENABLED=true

# Transport type (default: stdio)
MCP_TRANSPORT=stdio

# Server name for MCP clients (default: code-indexer)
MCP_SERVER_NAME=code-indexer

# Server version (default: 1.0.0)
MCP_SERVER_VERSION=1.0.0
```

### Client Configuration

Collection names are configured in the MCP client (not the server). This allows multiple clients to connect to the same deployed server and search different collections.

#### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

**Single Collection:**
```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "node",
      "args": [
        "/path/to/code-indexer/dist/main.js",
        "--collection",
        "my-repo"
      ],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

**Multiple Collections:**
```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "node",
      "args": [
        "/path/to/code-indexer/dist/main.js",
        "--collections",
        "repo1,repo2,repo3"
      ],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

#### Cline Configuration

In Cline's MCP settings, add:

```json
{
  "code-indexer": {
    "command": "node",
    "args": [
      "/path/to/code-indexer/dist/main.js",
      "--collection",
      "my-repo"
    ],
    "env": {
      "MCP_ENABLED": "true"
    }
  }
}
```

### Available MCP Tools

The MCP server exposes three tools for searching your codebase:

#### 1. search_code_semantic

Perform semantic search using vector embeddings to find relevant code snippets based on natural language queries.

**Parameters:**
- `query` (required): Natural language search query
- `prompt` (optional): Context to refine the search query (enables query expansion)
- `top_k` (optional): Number of results to return (default: 10)

**Example Usage in Claude:**
```
Use the search_code_semantic tool to find authentication functions in the codebase
```

#### 2. search_code_fulltext

Perform full-text search for exact or partial text matches in code content.

**Parameters:**
- `textQuery` (required): Text to search for in code content
- `payload` (optional): Filters to narrow results (e.g., `{"language": "typescript"}`)
- `top_k` (optional): Number of results to return (default: 10)

**Example Usage in Claude:**
```
Use the search_code_fulltext tool to find all occurrences of "async function" in TypeScript files
```

#### 3. search_code_by_payload

Search code by metadata filters only (e.g., file path, language, repository).

**Parameters:**
- `payload` (required): Metadata filters to match (e.g., `{"filePath": "/src/search/*"}`)
- `top_k` (optional): Number of results to return (default: 10)

**Example Usage in Claude:**
```
Use the search_code_by_payload tool to list all files in the /src/search/ directory
```

### Collection Configuration Strategy

**Why collections are configured in the client:**

1. **Simplicity**: AI assistants only need to provide search criteria, not collection names
2. **Client-specific**: Different clients can search different collections on the same server
3. **Flexibility**: Supports both single and multi-collection scenarios per client
4. **Security**: Collection access is controlled at the client configuration level

**Important Notes:**
- Collection names are **required** during client initialization
- Tools will fail with an error if no collection is configured
- Each MCP client can have its own collection configuration
- Multiple clients can connect to the same server with different collections

### Troubleshooting

#### Error: "Collection must be specified during client initialization"

This error occurs when the MCP client connects without providing collection arguments. Ensure your client configuration includes either `--collection` or `--collections` in the args array.

**Solution:**
```json
{
  "args": [
    "/path/to/code-indexer/dist/main.js",
    "--collection",
    "my-repo"  // Add this
  ]
}
```

#### MCP Server Not Starting

1. Verify `MCP_ENABLED=true` is set in your environment
2. Check the application logs for MCP initialization messages
3. Ensure all required dependencies are installed (`npm install`)

#### Tools Not Appearing in AI Assistant

1. Restart your AI assistant after updating the configuration
2. Verify the MCP server is running (`MCP server started on stdio transport` in logs)
3. Check that the command path in client config is correct

### Multiple Clients Example

You can configure multiple MCP clients to search different collections:

```json
{
  "mcpServers": {
    "code-indexer-frontend": {
      "command": "node",
      "args": [
        "/path/to/code-indexer/dist/main.js",
        "--collection",
        "frontend-repo"
      ],
      "env": {
        "MCP_ENABLED": "true"
      }
    },
    "code-indexer-backend": {
      "command": "node",
      "args": [
        "/path/to/code-indexer/dist/main.js",
        "--collections",
        "backend-api,backend-services"
      ],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

### Performance Considerations

- The MCP server has **zero impact** when disabled (default state)
- When enabled, it runs alongside the HTTP API without interference
- Each MCP client connection is independent
- Search performance is identical to HTTP API endpoints

## Architecture

- **NestJS**: Backend framework.
- **Qdrant**: Vector database for storing code embeddings.
- **OpenAI**: Used for generating embeddings (text-embedding-3-small/large).
- **GitLab API**: Source of code repositories.

## License

UNLICENSED
