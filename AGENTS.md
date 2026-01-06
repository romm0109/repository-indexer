**# Code Indexer**

*A semantic search engine for GitLab repositories, built with NestJS, Qdrant, and OpenAI.*

---

## Tech Stack  

| Layer | Technologies |
|-------|--------------|
| **Backend** | **NestJS** (TypeScript), **Qdrant** (vector store), **OpenAI** (embeddings & optional query‑refinement), **Docker** (Qdrant container), **MCP SDK** (`@modelcontextprotocol/sdk`) |
| **Frontend** | None (API‑only service; Swagger UI for interactive docs) |
| **Testing** | **Jest** (unit & integration), **Supertest** (e2e), **Nest testing utilities** |
| **Other** | **ESLint**, **Prettier**, **dotenv** for configuration, **GitLab API** for source‑code ingestion |

---

## Project Structure  

```
repository-indexer/                     # root of the project
├── src/                                # application source
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── main.ts
│   ├── config/                        # configuration handling
│   ├── chunking/                      # code‑chunking logic
│   ├── embedding/                     # OpenAI embedding service
│   ├── gitlab/                        # GitLab API integration
│   ├── indexer/                       # indexing controller + service
│   │   └── dto/                       # DTOs for indexing requests
│   ├── mcp/                           # Model‑Context‑Protocol server
│   ├── reranker/                      # optional reranking service
│   ├── search/                        # search controller + services
│   │   └── dto/                       # DTOs for search requests
│   └── vector-store/                  # Qdrant wrapper
├── test/                               # e2e test suite (Jest)
│   ├── app.e2e-spec.ts
│   ├── indexer.e2e-spec.ts
│   ├── mcp.e2e-spec.ts
│   └── search.e2e-spec.ts
├── .env.example                        # example environment file
├── Dockerfile                           # container for the NestJS app
├── docker‑compose.yml                   # brings up Qdrant + app (if needed)
├── package.json                         # npm scripts, dependencies
├── tsconfig.json / tsconfig.build.json  # TypeScript configuration
├── jest‑e2e.json                       # e2e test config
└── README.md                            # this file
```

---

## Commands  

| Goal | Command |
|------|---------|
| **Install dependencies** | `npm install` |
| **Run development server** (watch mode) | `npm run start:dev` |
| **Run production build** | `npm run build && npm run start:prod` |
| **Run unit / integration tests** | `npm test` (or `npm run test:watch`, `npm run test:cov`) |
| **Run end‑to‑end tests** | `npm run test:e2e` |
| **Start Qdrant (vector DB)** | `docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant` |
| **Lint / format** | `npm run lint` / `npm run format` |

*(All scripts are defined in `package.json`.)*

---

## MCP Servers  

The project can expose a **Model‑Context‑Protocol (MCP) server** for integration with Claude Desktop, Cline, etc.

```bash
# Enable MCP in .env
MCP_ENABLED=true
MCP_TRANSPORT=stdio   # or "grpc"
MCP_SERVER_NAME=code-indexer
MCP_SERVER_VERSION=1.0.0
```

---

## Reference Documentation  

| Document | When to Read |
|----------|--------------|
| `src/**/README.md` (if present) | Feature‑specific details |
| `README.md` (this file) | Quick start, commands, and high‑level overview |
| Swagger UI (`http://localhost:<PORT>/api`) | Interactive API docs |

---

## Code Conventions  

### Backend  
- **NestJS module pattern** – each feature lives in its own module (`<feature>.module.ts`).  
- **DTOs** for request validation (`class-validator`).  
- **Service‑oriented** – controllers thin, business logic in services.  
- **Async/await** for all I/O.  

### Testing  
- **Unit tests** in `src/**/*.spec.ts` using Jest.  
- **E2E tests** in `test/**/*.e2e-spec.ts` with Supertest against the running Nest app.  

### API Design  
- **RESTful** endpoints under `/search`, `/indexer`, `/mcp`.  
- **Swagger** auto‑generated (`@nestjs/swagger`).  

---

## Logging  

- Uses NestJS built‑in logger (`Logger`) – logs to stdout with level (`log`, `error`, `warn`, `debug`).  
- Structured JSON output can be enabled via `APP_LOG_FORMAT=json` in `.env` (optional).  

---

## Database  

- **Qdrant** (hosted locally via Docker, configurable via `QDRANT_URL`).  
- Collections correspond to individual GitLab repositories.  
- Each chunk is stored as a vector with payload `{ filePath, language, repository }`.  

---

## Testing Strategy  

### Testing Pyramid  

- **Unit tests** – core services (embedding, chunking, vector‑store).  
- **Integration tests** – controller‑service interaction, MCP server.  
- **E2E tests** – full request/response cycle (indexing → search).  

### Test Organization  

```
test/
├── unit/          # (optional) pure unit tests
├── integration/   # (optional) service‑level integration
└── e2e/           # current e2e specs (app.e2e-spec.ts, search.e2e-spec.ts, …)
```

All tests are runnable via the npm scripts shown above.  