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
  },
  chunking: {
    size: parseInt(process.env.CHUNK_SIZE ?? '512', 10),
    overlap: parseInt(process.env.CHUNK_OVERLAP ?? '64', 10),
  },
}));