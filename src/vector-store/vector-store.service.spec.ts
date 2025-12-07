import { Test, TestingModule } from '@nestjs/testing';
import { VectorStoreService } from './vector-store.service';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let mockQdrantClient: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'app.qdrant.url') return 'http://localhost:6333';
      if (key === 'app.qdrant.apiKey') return 'test-api-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VectorStoreService>(VectorStoreService);

    // Mock the internal Qdrant client
    mockQdrantClient = {
      scroll: jest.fn(),
      search: jest.fn(),
      query: jest.fn(),
      getCollections: jest.fn(),
      createCollection: jest.fn(),
      upsert: jest.fn(),
    };

    // Replace the internal client with our mock
    (service as any).client = mockQdrantClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fulltextSearch', () => {
    it('should perform full-text search with text query only', async () => {
      const collectionName = 'test-collection';
      const textQuery = 'function test';
      const mockPoints = [
        { id: '1', payload: { text: 'function test() {}', filePath: '/src/test.ts' } },
        { id: '2', payload: { text: 'function testHelper() {}', filePath: '/src/helper.ts' } },
      ];

      mockQdrantClient.scroll.mockResolvedValue({ points: mockPoints });

      const result = await service.fulltextSearch(collectionName, textQuery);

      expect(result).toEqual(mockPoints);
      expect(mockQdrantClient.scroll).toHaveBeenCalledWith(collectionName, {
        filter: {
          must: [
            {
              key: 'text',
              match: { text: textQuery },
            },
          ],
        },
        limit: 10,
        with_payload: true,
      });
    });

    it('should perform full-text search with payload filters', async () => {
      const collectionName = 'codebase';
      const textQuery = 'class';
      const payload = { language: 'typescript', repository: 'my-repo' };
      const limit = 5;
      const mockPoints = [
        { id: '1', payload: { text: 'class MyClass {}', language: 'typescript', repository: 'my-repo' } },
      ];

      mockQdrantClient.scroll.mockResolvedValue({ points: mockPoints });

      const result = await service.fulltextSearch(collectionName, textQuery, payload, limit);

      expect(result).toEqual(mockPoints);
      expect(mockQdrantClient.scroll).toHaveBeenCalledWith(collectionName, {
        filter: {
          must: [
            {
              key: 'text',
              match: { text: textQuery },
            },
            {
              key: 'language',
              match: { value: 'typescript' },
            },
            {
              key: 'repository',
              match: { value: 'my-repo' },
            },
          ],
        },
        limit: 5,
        with_payload: true,
      });
    });

    it('should return empty array when no matches found', async () => {
      mockQdrantClient.scroll.mockResolvedValue({ points: [] });

      const result = await service.fulltextSearch('codebase', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should throw HttpException on Qdrant error', async () => {
      mockQdrantClient.scroll.mockRejectedValue(new Error('Qdrant connection failed'));

      await expect(service.fulltextSearch('codebase', 'test')).rejects.toThrow(HttpException);
      await expect(service.fulltextSearch('codebase', 'test')).rejects.toThrow(
        'Failed to perform full-text search: Qdrant connection failed',
      );
    });

    it('should use default limit of 10 when not specified', async () => {
      mockQdrantClient.scroll.mockResolvedValue({ points: [] });

      await service.fulltextSearch('codebase', 'query');

      expect(mockQdrantClient.scroll).toHaveBeenCalledWith(
        'codebase',
        expect.objectContaining({ limit: 10 }),
      );
    });
  });
});