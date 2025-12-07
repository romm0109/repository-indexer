# Design: Optional Reranker

## Architecture
The reranking logic will be encapsulated in a `RerankerService`. This service will be injected into `SearchService`.

### Conditional Logic
The `SearchService` will check if the reranker is configured (i.e., URL/Key/Model are present) during initialization or at runtime.
- If configured: The search pipeline will be `Embed Query -> Vector Search -> Rerank -> Return`.
- If not configured: The search pipeline will be `Embed Query -> Vector Search -> Return`.

### Configuration
New configuration namespace `reranker` in `src/config/configuration.ts`:
```typescript
reranker: {
  url: process.env.RERANKER_URL,
  apiKey: process.env.RERANKER_API_KEY,
  modelName: process.env.RERANKER_MODEL_NAME, // e.g., 'jina-reranker-v1-base-en'
}
```

### Interface
The `RerankerService` will expose a method:
```typescript
rerank(query: string, documents: string[], topK?: number): Promise<{ index: number; score: number }[]>
```
Or similar, depending on the specific reranker API chosen (likely generic enough to support Jina/Cohere/etc. via a standard interface or just a simple HTTP call for now). For this iteration, we'll assume a generic HTTP-based reranker (like Jina AI or a local service).

## Trade-offs
- **Latency**: Reranking adds latency. It should be optional.
- **Complexity**: Adds another service. Kept minimal by making it a simple pass-through if disabled.