import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class VectorStoreService {
  private client: QdrantClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('app.qdrant.url');
    const apiKey = this.configService.get<string>('app.qdrant.apiKey');

    this.client = new QdrantClient({
      url,
      apiKey,
      checkCompatibility: false,
    });
  }

  async createCollection(name: string, vectorSize: number): Promise<void> {
    try {
      const result = await this.client.getCollections();
      const exists = result.collections.some((c) => c.name === name);

      if (!exists) {
        await this.client.createCollection(name, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      throw new HttpException(
        `Failed to create collection: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async upsertPoints(collectionName: string, points: any[]): Promise<void> {
    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points
      });
    } catch (error) {
      // Try to include any server-provided payload for easier debugging
      const details = (error && (error.response?.data || error.message)) || String(error);
      throw new HttpException(
        `Failed to upsert points: ${JSON.stringify(details)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async search(collectionName: string, vector: number[], limit: number = 10): Promise<any[]> {
    try {
      const result = await this.client.search(collectionName, {
        vector,
        limit,
        with_payload: true,
      });
      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchByPayload(collectionName: string, payload: Record<string, any>, limit: number = 10): Promise<any[]> {
    try {
      const result = (await this.client.query(collectionName, {
        filter: payload,
        limit,
        with_payload: true,
      })).points;
      
      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}