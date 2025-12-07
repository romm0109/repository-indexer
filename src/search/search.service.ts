import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { RerankerService } from '../reranker/reranker.service';
import { QueryRefinementService } from './query-refinement.service';

@Injectable()
export class SearchService {
  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
    private vectorStoreService: VectorStoreService,
    private rerankerService: RerankerService,
    private queryRefinementService: QueryRefinementService,
  ) { }

  async search(
    query: string,
    collectionName: string = 'codebase',
    prompt?: string,
    topK: number = 10,
  ): Promise<any[]> {
    let queriesToSearch = [query];

    // 1. Refine query if prompt is provided
    if (prompt) {
      queriesToSearch = await this.queryRefinementService.refineQuery(
        query,
        prompt,
      );
    }

    // 2. Search for each query and aggregate results
    const allResults = new Map<string, any>();

    for (const q of queriesToSearch) {
      const queryVector = await this.embeddingService.embedQuery(q);
      const results = await this.vectorStoreService.search(
        collectionName,
        queryVector,
        topK,
      );

      for (const result of results) {
        // Deduplicate by ID (assuming result.id is unique per document)
        // If ID is not available, we might need another strategy, but Qdrant returns IDs.
        if (result.id && !allResults.has(result.id as string)) {
          allResults.set(result.id as string, result);
        }
      }
    }

    const uniqueResults = Array.from(allResults.values());

    // 3. (Optional) Rerank results
    // Always rerank against the ORIGINAL query
    if (this.rerankerService.isEnabled()) {
      const documents = uniqueResults
        .map((r) => r.payload?.text as string)
        .filter(Boolean);

      // If we have documents to rerank
      if (documents.length > 0) {
        const reranked = await this.rerankerService.rerank(query, documents);

        // Map reranked scores back to original results
        const rerankedResults = reranked.map((r) => {
          const originalResult = uniqueResults[r.index];
          return {
            ...originalResult,
            score: r.score,
          };
        });

        // Sort by new score descending
        rerankedResults.sort((a, b) => b.score - a.score);

        return rerankedResults.slice(0, topK).map((result) => ({
          score: result.score,
          ...result.payload,
        }));
      }
    }

    // 4. Format results (fallback or if reranker disabled)
    // If we have multiple queries but no reranker, the scores might be incomparable.
    // Ideally, we should always have a reranker if we do query expansion.
    // But as a fallback, we just return the unique results sorted by their original vector score (if available)
    // or just as is.
    uniqueResults.sort((a, b) => b.score - a.score);

    return uniqueResults.slice(0, topK).map((result) => ({
      score: result.score,
      ...result.payload,
    }));
  }

  async searchByPayload(
    payloadQuery: Record<string, any>,
    collectionName: string = 'codebase',
    topK: number = 10,
  ): Promise<any[]> {
    const results = await this.vectorStoreService.searchByPayload(
      collectionName,
      payloadQuery,
      topK,
    );

    return results;
  }
}