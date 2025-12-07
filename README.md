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
- **Search**: Queries the vector store and returns relevant code snippets.
- **Reranker**: Improves search results using a reranking model.

## Architecture

- **NestJS**: Backend framework.
- **Qdrant**: Vector database for storing code embeddings.
- **OpenAI**: Used for generating embeddings (text-embedding-3-small/large).
- **GitLab API**: Source of code repositories.

## License

UNLICENSED
