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

      expect(result).toEqual([
        { id: '1', collectionName: 'test-collection', payload: { text: 'function test() {}', filePath: '/src/test.ts' } },
        { id: '2', collectionName: 'test-collection', payload: { text: 'function testHelper() {}', filePath: '/src/helper.ts' } },
      ]);
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

      expect(result).toEqual([
        { id: '1', collectionName: 'codebase', payload: { text: 'class MyClass {}', language: 'typescript', repository: 'my-repo' } },
      ]);
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

  describe('Multi-collection search', () => {
    it('should search across multiple collections and aggregate results', async () => {
      const collections = ['collection1', 'collection2'];
      const vector = [0.1, 0.2, 0.3];
      const mockResults1 = [
        { id: '1', score: 0.9, payload: { text: 'result from collection1' } },
        { id: '2', score: 0.8, payload: { text: 'another result from collection1' } },
      ];
      const mockResults2 = [
        { id: '3', score: 0.85, payload: { text: 'result from collection2' } },
        { id: '4', score: 0.75, payload: { text: 'another result from collection2' } },
      ];

      mockQdrantClient.search
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      const result = await service.search(collections, vector, 10);

      expect(result).toHaveLength(4);
      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.85);
      expect(result[2].score).toBe(0.8);
      expect(result[3].score).toBe(0.75);
      expect(mockQdrantClient.search).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate results by ID across collections', async () => {
      const collections = ['collection1', 'collection2'];
      const vector = [0.1, 0.2, 0.3];
      const mockResults1 = [
        { id: '1', score: 0.9, payload: { text: 'result 1' } },
        { id: '2', score: 0.8, payload: { text: 'result 2' } },
      ];
      const mockResults2 = [
        { id: '1', score: 0.85, payload: { text: 'duplicate result 1' } },
        { id: '3', score: 0.75, payload: { text: 'result 3' } },
      ];

      mockQdrantClient.search
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      const result = await service.search(collections, vector, 10);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.id === '1').score).toBe(0.9); // Higher score kept
      expect(result.find(r => r.id === '1').payload.text).toBe('result 1');
    });

    it('should respect limit when aggregating multi-collection results', async () => {
      const collections = ['collection1', 'collection2'];
      const vector = [0.1, 0.2, 0.3];
      const mockResults1 = [
        { id: '1', score: 0.9, payload: { text: 'result 1' } },
        { id: '2', score: 0.8, payload: { text: 'result 2' } },
      ];
      const mockResults2 = [
        { id: '3', score: 0.85, payload: { text: 'result 3' } },
        { id: '4', score: 0.75, payload: { text: 'result 4' } },
      ];

      mockQdrantClient.search
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      const result = await service.search(collections, vector, 2);

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.85);
    });

    it('should handle single collection as string (backward compatibility)', async () => {
      const collectionName = 'single-collection';
      const vector = [0.1, 0.2, 0.3];
      const mockResults = [
        { id: '1', score: 0.9, payload: { text: 'result 1' } },
      ];

      mockQdrantClient.search.mockResolvedValue(mockResults);

      const result = await service.search(collectionName, vector, 10);

      expect(result).toEqual([
        { id: '1', score: 0.9, collectionName: 'single-collection', payload: { text: 'result 1' } },
      ]);
      expect(mockQdrantClient.search).toHaveBeenCalledTimes(1);
      expect(mockQdrantClient.search).toHaveBeenCalledWith(collectionName, {
        vector,
        limit: 10,
        with_payload: true,
      });
    });
  });

  describe('Multi-collection searchByPayload', () => {
    it('should search by payload across multiple collections', async () => {
      const collections = ['collection1', 'collection2'];
      const payload = { language: 'typescript' };
      const mockResults1 = [
        { id: '1', score: 0.9, payload: { text: 'result 1', language: 'typescript' } },
      ];
      const mockResults2 = [
        { id: '2', score: 0.8, payload: { text: 'result 2', language: 'typescript' } },
      ];

      mockQdrantClient.query
        .mockResolvedValueOnce({ points: mockResults1 })
        .mockResolvedValueOnce({ points: mockResults2 });

      const result = await service.searchByPayload(collections, payload, 10);

      expect(result).toHaveLength(2);
      expect(mockQdrantClient.query).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate payload search results across collections', async () => {
      const collections = ['collection1', 'collection2'];
      const payload = { repository: 'my-repo' };
      const mockResults1 = [
        { id: '1', score: 0.9, payload: { text: 'result 1' } },
      ];
      const mockResults2 = [
        { id: '1', score: 0.85, payload: { text: 'duplicate result 1' } },
        { id: '2', score: 0.8, payload: { text: 'result 2' } },
      ];

      mockQdrantClient.query
        .mockResolvedValueOnce({ points: mockResults1 })
        .mockResolvedValueOnce({ points: mockResults2 });

      const result = await service.searchByPayload(collections, payload, 10);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.id === '1').score).toBe(0.9);
    });
  });

  describe('Multi-collection fulltextSearch', () => {
    it('should perform full-text search across multiple collections', async () => {
      const collections = ['collection1', 'collection2'];
      const textQuery = 'function test';
      const mockPoints1 = [
        { id: '1', payload: { text: 'function test() {}' } },
      ];
      const mockPoints2 = [
        { id: '2', payload: { text: 'function testHelper() {}' } },
      ];

      mockQdrantClient.scroll
        .mockResolvedValueOnce({ points: mockPoints1 })
        .mockResolvedValueOnce({ points: mockPoints2 });

      const result = await service.fulltextSearch(collections, textQuery);

      expect(result).toHaveLength(2);
      expect(mockQdrantClient.scroll).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate full-text search results across collections', async () => {
      const collections = ['collection1', 'collection2'];
      const textQuery = 'class';
      const mockPoints1 = [
        { id: '1', payload: { text: 'class MyClass {}' } },
      ];
      const mockPoints2 = [
        { id: '1', payload: { text: 'class MyClass {}' } },
        { id: '2', payload: { text: 'class OtherClass {}' } },
      ];

      mockQdrantClient.scroll
        .mockResolvedValueOnce({ points: mockPoints1 })
        .mockResolvedValueOnce({ points: mockPoints2 });

      const result = await service.fulltextSearch(collections, textQuery);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('should apply payload filters to all collections in full-text search', async () => {
      const collections = ['collection1', 'collection2'];
      const textQuery = 'function';
      const payload = { language: 'typescript' };
      const mockPoints = [{ id: '1', payload: { text: 'function test() {}' } }];

      mockQdrantClient.scroll.mockResolvedValue({ points: mockPoints });

      await service.fulltextSearch(collections, textQuery, payload, 10);

      expect(mockQdrantClient.scroll).toHaveBeenCalledTimes(2);
      expect(mockQdrantClient.scroll).toHaveBeenCalledWith('collection1', {
        filter: {
          must: [
            { key: 'text', match: { text: textQuery } },
            { key: 'language', match: { value: 'typescript' } },
          ],
        },
        limit: 10,
        with_payload: true,
      });
    });
  });
});