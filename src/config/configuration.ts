import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  gitlab: {
    url: process.env.GITLAB_URL || 'https://gitlab.com',
    token: process.env.GITLAB_TOKEN,
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  embedding: {
    url: process.env.EMBEDDING_URL,
    apiKey: process.env.EMBEDDING_API_KEY,
    modelName: process.env.EMBEDDING_MODEL_NAME || 'text-embedding-3-small',
    vectorSize: parseInt(process.env.EMBEDDING_VECTOR_SIZE ?? '1536', 10),
    retries: parseInt(process.env.EMBEDDING_RETRIES ?? '3', 10),
    retryDelay: parseInt(process.env.EMBEDDING_RETRY_DELAY ?? '1000', 10),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '1', 10),
  },
  chunking: {
    size: parseInt(process.env.CHUNK_SIZE ?? '256', 10),
    overlap: parseInt(process.env.CHUNK_OVERLAP ?? '32', 10),
  },
  reranker: {
    url: process.env.RERANKER_URL,
    apiKey: process.env.RERANKER_API_KEY,
    modelName: process.env.RERANKER_MODEL_NAME,
  },
  refine: {
    url: process.env.REFINE_URL,
    apiKey: process.env.REFINE_API_KEY,
    modelName: process.env.REFINE_MODEL_NAME,
  },
}));