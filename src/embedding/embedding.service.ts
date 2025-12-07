import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private openai: OpenAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.embedding.apiKey');
    const baseURL = this.configService.get<string>('app.embedding.url');

    if (!apiKey) {
        // Warn or throw, but for now we'll assume it might be set later or mocked
        console.warn('Embedding API Key not set');
    }
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy', // Prevent crash on init if missing
      baseURL: baseURL,
    });
    this.modelName = this.configService.get<string>('app.embedding.modelName') || 'text-embedding-3-small';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI has a limit on batch size, we might need to chunk requests if texts is large
      // For now, assume reasonable batch size
      const response = await this.openai.embeddings.create({
        model: this.modelName,
        input: texts,
        encoding_format: 'float',
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
       throw new HttpException(
        `Failed to embed documents: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.modelName,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new HttpException(
        `Failed to embed query: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}