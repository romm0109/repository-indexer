import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface RerankResult {
  index: number;
  score: number;
}

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);
  private readonly url: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly modelName: string | undefined;

  constructor(private configService: ConfigService) {
    this.url = this.configService.get<string>('app.reranker.url');
    this.apiKey = this.configService.get<string>('app.reranker.apiKey');
    this.modelName = this.configService.get<string>('app.reranker.modelName');

    if (this.isEnabled()) {
      this.logger.log(`Reranker enabled using model: ${this.modelName} at ${this.url}`);
    } else {
      this.logger.log('Reranker disabled (missing configuration)');
    }
  }

  isEnabled(): boolean {
    return !!(this.url && this.modelName);
  }

  async rerank(query: string, documents: string[], topK?: number): Promise<RerankResult[]> {
    if (!this.isEnabled()) {
      this.logger.warn('Rerank called but service is disabled. Returning original order.');
      return documents.map((_, index) => ({ index, score: 1 }));
    }

    try {      
      const response = await axios.post(
        `${this.url}/rerank`,
        {
          model: this.modelName,
          query: query,
          documents: documents,
          top_n: topK,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results.map((item: any) => ({
          index: item.index,
          score: item.relevance_score,
        }));
      }

      this.logger.error('Unexpected reranker response format', response.data);
      return documents.map((_, index) => ({ index, score: 0 }));

    } catch (error) {
      this.logger.error(`Reranking failed: ${error.message}`, error.stack);
      // Fallback to original order on failure
      return documents.map((_, index) => ({ index, score: 0 }));
    }
  }
}