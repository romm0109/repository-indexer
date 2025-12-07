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
- **Full-Text Search**: Search for exact or partial text matches within indexed code content.
- **Query Refinement**: Optionally expands search queries using an LLM to improve recall.
- **Reranker**: Improves search results using a reranking model.

## API Endpoints

### Search Endpoints

#### POST /search
Semantic search using vector embeddings.

**Request Body:**
```json
{
  "query": "string",
  "collectionName": "string",
  "prompt": "string (optional)",
  "top_k": 10
}
```

#### POST /search/fulltext
Full-text search for exact or partial text matches within indexed code content.

**Request Body:**
```json
{
  "textQuery": "string",
  "collectionName": "string",
  "payload": {
    "language": "typescript",
    "filePath": "/src/*"
  },
  "top_k": 10
}
```

**Parameters:**
- `textQuery` (required): The text to search for in code content
- `collectionName` (required): Name of the Qdrant collection to search
- `payload` (optional): Filters to narrow results (e.g., by file path, repository, language)
- `top_k` (optional): Number of results to return (default: 10)

**Response:**
```json
[
  {
    "id": "string",
    "text": "function hello() { ... }",
    "filePath": "/src/main.ts",
    "language": "typescript"
  }
]
```

#### POST /search/payload
Search by payload filters only (without text matching).

**Request Body:**
```json
{
  "collectionName": "string",
  "payload": {
    "filePath": "/src/utils.ts"
  },
  "top_k": 10
}
```

## Architecture

- **NestJS**: Backend framework.
- **Qdrant**: Vector database for storing code embeddings.
- **OpenAI**: Used for generating embeddings (text-embedding-3-small/large).
- **GitLab API**: Source of code repositories.

## License

UNLICENSED
