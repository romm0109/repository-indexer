import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { normalize } from '../utils';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.embedding.apiKey');
    const baseURL = this.configService.get<string>('app.embedding.url');

    if (!apiKey) {
        // Warn or throw, but for now we'll assume it might be set later or mocked
        this.logger.warn('Embedding API Key not set');
    }
    const options: any = {
      apiKey: apiKey || 'dummy', // Prevent crash on init if missing
    };
    if (baseURL) {
      options.baseURL = baseURL;
    }
    options.timeout = 120000; // 120 seconds timeout
    this.openai = new OpenAI(options);
    this.modelName = this.configService.get<string>('app.embedding.modelName') || 'text-embedding-3-small';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const batchSize = this.configService.get<number>('app.embedding.batchSize') || 10;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchEmbeddings = await this.retryOperation(async () => {
        try {
          const response = await this.openai.embeddings.create({
            model: this.modelName,
            input: batch,
            encoding_format: 'float',
          });

          return response.data.map((item) => normalize(item.embedding));
        } catch (error) {
          throw new HttpException(
            `Failed to embed documents batch ${i / batchSize + 1}: ${error.message}`,
            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      });

      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.retryOperation(async () => {
      try {
        const response = await this.openai.embeddings.create({
          model: this.modelName,
          input: text,
          encoding_format: 'float',
        });

        return normalize(response.data[0].embedding);
      } catch (error) {
        throw new HttpException(
          `Failed to embed query: ${error.message}`,
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    const retries = this.configService.get<number>('app.embedding.retries') || 3;
    const baseDelay = this.configService.get<number>('app.embedding.retryDelay') || 1000;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        const status =
          error instanceof HttpException
            ? error.getStatus()
            : error.response?.status || 500;

        // Don't retry on client errors (4xx), except for Too Many Requests (429)
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        if (attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.logger.warn(
            `Embedding attempt ${attempt + 1} failed. Retrying in ${delay}ms... Error: ${error.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}