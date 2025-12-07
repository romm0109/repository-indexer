import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { RerankerService } from '../reranker/reranker.service';

@Injectable()
export class SearchService {
  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
    private vectorStoreService: VectorStoreService,
    private rerankerService: RerankerService,
  ) {}

  async search(query: string, collectionName: string = 'codebase'): Promise<any[]> {
    // 1. Embed the query
    const queryVector = await this.embeddingService.embedQuery(query);

    // 2. Search in Vector Store
    const results = await this.vectorStoreService.search(collectionName, queryVector);

    // 3. (Optional) Rerank results
    if (this.rerankerService.isEnabled()) {
      const documents = results.map(r => r.payload?.text as string).filter(Boolean);
      
      // If we have documents to rerank
      if (documents.length > 0) {
        const reranked = await this.rerankerService.rerank(query, documents);
        
        // Map reranked scores back to original results
        // Note: This assumes reranker returns indices relative to the input list
        const rerankedResults = reranked.map(r => {
          const originalResult = results[r.index];
          return {
            ...originalResult,
            score: r.score,
          };
        });

        // Sort by new score descending
        rerankedResults.sort((a, b) => b.score - a.score);

        return rerankedResults.map(result => ({
          score: result.score,
          ...result.payload
        }));
      }
    }
    
    // 4. Format results (fallback or if reranker disabled)
    return results.map(result => ({
        score: result.score,
        ...result.payload
    }));
  }
}