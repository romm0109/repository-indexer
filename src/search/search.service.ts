import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

@Injectable()
export class SearchService {
  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
    private vectorStoreService: VectorStoreService,
  ) {}

  async search(query: string, collectionName: string = 'codebase'): Promise<any[]> {
    // 1. Embed the query
    const queryVector = await this.embeddingService.embedQuery(query);

    // 2. Search in Vector Store
    const results = await this.vectorStoreService.search(collectionName, queryVector);

    // 3. (Optional) Rerank results - skipping for now as per design doc "Optional"
    
    // 4. Format results
    return results.map(result => ({
        score: result.score,
        ...result.payload
    }));
  }
}