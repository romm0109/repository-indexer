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
        points,
      });
    } catch (error) {
      // Try to include any server-provided payload for easier debugging
      const details =
        (error && (error.response?.data || error.message)) || String(error);
      throw new HttpException(
        `Failed to upsert points: ${JSON.stringify(details)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Normalize collection name(s) to always return an array
   */
  private normalizeCollectionNames(
    collectionName: string | string[],
  ): string[] {
    return Array.isArray(collectionName) ? collectionName : [collectionName];
  }

  /**
   * Deduplicate results by document ID, keeping the highest score for duplicates
   */
  private deduplicateResults(results: any[]): any[] {
    const resultMap = new Map<string, any>();

    for (const result of results) {
      const id = String(result.id);
      const existing = resultMap.get(id);

      // Keep the result with the higher score
      if (!existing || result.score > existing.score) {
        resultMap.set(id, result);
      }
    }

    return Array.from(resultMap.values());
  }

  async search(
    collectionName: string | string[],
    vector: number[],
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const collections = this.normalizeCollectionNames(collectionName);
      const allResults: any[] = [];

      // Search each collection
      for (const collection of collections) {
        const result = await this.client.search(collection, {
          vector,
          limit,
          with_payload: true,
        });
        // Add collection name to each result
        const resultsWithCollection = result.map((r) => ({
          ...r,
          collectionName: collection,
        }));
        allResults.push(...resultsWithCollection);
      }

      // Deduplicate and sort by score
      const uniqueResults = this.deduplicateResults(allResults);
      uniqueResults.sort((a, b) => b.score - a.score);

      // Return top results up to limit
      return uniqueResults.slice(0, limit);
    } catch (error) {
      throw new HttpException(
        `Failed to search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchByPayload(
    collectionName: string | string[],
    payload: Record<string, any>,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const collections = this.normalizeCollectionNames(collectionName);
      const allResults: any[] = [];

      const mustConditions: any[] = [];

      if (payload) {
        for (const [key, value] of Object.entries(payload)) {
          mustConditions.push({
            key,
            match: { value },
          });
        }
      }

      // Search each collection
      for (const collection of collections) {
        const result = (
          await this.client.query(collection, {
            filter: {
              must: mustConditions,
            },
            limit,
            with_payload: true,
          })
        ).points;

        // Add collection name to each result
        const resultsWithCollection = result.map((r) => ({
          ...r,
          collectionName: collection,
        }));
        allResults.push(...resultsWithCollection);
      }

      // Deduplicate results
      const uniqueResults = this.deduplicateResults(allResults);

      // Sort by score if available, otherwise maintain order
      if (uniqueResults.length > 0 && uniqueResults[0].score !== undefined) {
        uniqueResults.sort((a, b) => b.score - a.score);
      }

      return uniqueResults.slice(0, limit);
    } catch (error) {
      throw new HttpException(
        `Failed to search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fulltextSearch(
    collectionName: string | string[],
    textQuery: string,
    payload?: Record<string, any>,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const collections = this.normalizeCollectionNames(collectionName);
      const allResults: any[] = [];

      // Build the filter with text match condition
      const mustConditions: any[] = [
        {
          key: 'text',
          match: {
            text: textQuery,
          },
        },
      ];

      // Add payload filters if provided
      if (payload) {
        for (const [key, value] of Object.entries(payload)) {
          mustConditions.push({
            key,
            match: { value },
          });
        }
      }

      // Search each collection
      for (const collection of collections) {
        const result = await this.client.scroll(collection, {
          filter: {
            must: mustConditions,
          },
          limit,
          with_payload: true,
        });

        // Add collection name to each result
        const resultsWithCollection = result.points.map((r) => ({
          ...r,
          collectionName: collection,
        }));
        allResults.push(...resultsWithCollection);
      }

      // Deduplicate results
      const uniqueResults = this.deduplicateResults(allResults);

      return uniqueResults.slice(0, limit);
    } catch (error) {
      throw new HttpException(
        `Failed to perform full-text search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
