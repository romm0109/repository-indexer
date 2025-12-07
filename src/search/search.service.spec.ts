import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { RerankerService } from '../reranker/reranker.service';
import { QueryRefinementService } from './query-refinement.service';

describe('SearchService', () => {
  let service: SearchService;
  let embeddingService: EmbeddingService;
  let vectorStoreService: VectorStoreService;
  let rerankerService: RerankerService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmbeddingService = {
    embedQuery: jest.fn(),
  };

  const mockVectorStoreService = {
    search: jest.fn(),
    fulltextSearch: jest.fn(),
    searchByPayload: jest.fn(),
  };

  const mockRerankerService = {
    isEnabled: jest.fn(),
    rerank: jest.fn(),
  };

  const mockQueryRefinementService = {
    refineQuery: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        { provide: VectorStoreService, useValue: mockVectorStoreService },
        { provide: RerankerService, useValue: mockRerankerService },
        { provide: QueryRefinementService, useValue: mockQueryRefinementService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    vectorStoreService = module.get<VectorStoreService>(VectorStoreService);
    rerankerService = module.get<RerankerService>(RerankerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search without reranking when reranker is disabled', async () => {
    const query = 'test query';
    const queryVector = [0.1, 0.2];
    const searchResults = [
      { id: '1', score: 0.9, payload: { text: 'doc1' } },
      { id: '2', score: 0.8, payload: { text: 'doc2' } },
    ];

    mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
    mockVectorStoreService.search.mockResolvedValue(searchResults);
    mockRerankerService.isEnabled.mockReturnValue(false);

    const result = await service.search(query);

    const expectedResults = [
      { score: 0.9, text: 'doc1' },
      { score: 0.8, text: 'doc2' },
    ];

    expect(result).toEqual(expectedResults);
    expect(mockEmbeddingService.embedQuery).toHaveBeenCalledWith(query);
    expect(mockVectorStoreService.search).toHaveBeenCalledWith('codebase', queryVector, 10);
    expect(mockRerankerService.rerank).not.toHaveBeenCalled();
  });

  it('should search and rerank when reranker is enabled', async () => {
    const query = 'test query';
    const queryVector = [0.1, 0.2];
    const searchResults = [
      { id: '1', score: 0.9, payload: { text: 'doc1' } },
      { id: '2', score: 0.8, payload: { text: 'doc2' } },
    ];
    const rerankedResults = [
      { index: 1, score: 0.95 },
      { index: 0, score: 0.85 },
    ];

    mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
    mockVectorStoreService.search.mockResolvedValue(searchResults);
    mockRerankerService.isEnabled.mockReturnValue(true);
    mockRerankerService.rerank.mockResolvedValue(rerankedResults);

    const result = await service.search(query);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('doc2'); // doc2 was index 1, now first
    expect(result[0].score).toBe(0.95);
    expect(result[1].text).toBe('doc1'); // doc1 was index 0, now second
    expect(result[1].score).toBe(0.85);

    expect(mockRerankerService.rerank).toHaveBeenCalledWith(query, ['doc1', 'doc2']);
  });

  it('should handle empty search results gracefully', async () => {
    mockEmbeddingService.embedQuery.mockResolvedValue([0.1]);
    mockVectorStoreService.search.mockResolvedValue([]);
    mockRerankerService.isEnabled.mockReturnValue(true);

    const result = await service.search('query');

    expect(result).toEqual([]);
    expect(mockRerankerService.rerank).not.toHaveBeenCalled();
  });

  describe('fulltextSearch', () => {
    it('should perform full-text search and return formatted results', async () => {
      const textQuery = 'function test';
      const collectionName = 'test-collection';
      const fulltextResults = [
        { id: '1', payload: { text: 'function test() {}', filePath: '/src/test.ts' } },
        { id: '2', payload: { text: 'function testHelper() {}', filePath: '/src/helper.ts' } },
      ];

      mockVectorStoreService.fulltextSearch.mockResolvedValue(fulltextResults);

      const result = await service.fulltextSearch(textQuery, collectionName);

      expect(result).toEqual([
        { id: '1', text: 'function test() {}', filePath: '/src/test.ts' },
        { id: '2', text: 'function testHelper() {}', filePath: '/src/helper.ts' },
      ]);
      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        collectionName,
        textQuery,
        undefined,
        10,
      );
    });

    it('should perform full-text search with payload filters', async () => {
      const textQuery = 'class';
      const collectionName = 'codebase';
      const payload = { language: 'typescript' };
      const topK = 5;
      const fulltextResults = [
        { id: '1', payload: { text: 'class MyClass {}', language: 'typescript' } },
      ];

      mockVectorStoreService.fulltextSearch.mockResolvedValue(fulltextResults);

      const result = await service.fulltextSearch(textQuery, collectionName, payload, topK);

      expect(result).toEqual([
        { id: '1', text: 'class MyClass {}', language: 'typescript' },
      ]);
      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        collectionName,
        textQuery,
        payload,
        topK,
      );
    });

    it('should return empty array when no matches found', async () => {
      mockVectorStoreService.fulltextSearch.mockResolvedValue([]);

      const result = await service.fulltextSearch('nonexistent', 'codebase');

      expect(result).toEqual([]);
    });

    it('should use default collection name and topK when not provided', async () => {
      mockVectorStoreService.fulltextSearch.mockResolvedValue([]);

      await service.fulltextSearch('query');

      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        'codebase',
        'query',
        undefined,
        10,
      );
    });
  });

  describe('Multi-collection search', () => {
    it('should search across multiple collections', async () => {
      const query = 'test query';
      const collections = ['collection1', 'collection2'];
      const queryVector = [0.1, 0.2];
      const searchResults = [
        { id: '1', score: 0.9, payload: { text: 'doc1' } },
        { id: '2', score: 0.8, payload: { text: 'doc2' } },
      ];

      mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
      mockVectorStoreService.search.mockResolvedValue(searchResults);
      mockRerankerService.isEnabled.mockReturnValue(false);

      const result = await service.search(query, collections);

      expect(mockVectorStoreService.search).toHaveBeenCalledWith(collections, queryVector, 10);
      expect(result).toHaveLength(2);
    });

    it('should handle multi-collection search with reranking', async () => {
      const query = 'test query';
      const collections = ['collection1', 'collection2'];
      const queryVector = [0.1, 0.2];
      const searchResults = [
        { id: '1', score: 0.9, payload: { text: 'doc1' } },
        { id: '2', score: 0.8, payload: { text: 'doc2' } },
      ];
      const rerankedResults = [
        { index: 1, score: 0.95 },
        { index: 0, score: 0.85 },
      ];

      mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
      mockVectorStoreService.search.mockResolvedValue(searchResults);
      mockRerankerService.isEnabled.mockReturnValue(true);
      mockRerankerService.rerank.mockResolvedValue(rerankedResults);

      const result = await service.search(query, collections);

      expect(mockVectorStoreService.search).toHaveBeenCalledWith(collections, queryVector, 10);
      expect(result[0].text).toBe('doc2');
      expect(result[0].score).toBe(0.95);
    });

    it('should support backward compatibility with single collection string', async () => {
      const query = 'test query';
      const collection = 'single-collection';
      const queryVector = [0.1, 0.2];
      const searchResults = [
        { id: '1', score: 0.9, payload: { text: 'doc1' } },
      ];

      mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
      mockVectorStoreService.search.mockResolvedValue(searchResults);
      mockRerankerService.isEnabled.mockReturnValue(false);

      const result = await service.search(query, collection);

      expect(mockVectorStoreService.search).toHaveBeenCalledWith(collection, queryVector, 10);
      expect(result).toHaveLength(1);
    });
  });

  describe('Multi-collection searchByPayload', () => {
    it('should search by payload across multiple collections', async () => {
      const payload = { language: 'typescript' };
      const collections = ['collection1', 'collection2'];
      const searchResults = [
        { id: '1', payload: { text: 'doc1', language: 'typescript' } },
        { id: '2', payload: { text: 'doc2', language: 'typescript' } },
      ];

      mockVectorStoreService.searchByPayload.mockResolvedValue(searchResults);

      const result = await service.searchByPayload(payload, collections);

      expect(mockVectorStoreService.searchByPayload).toHaveBeenCalledWith(collections, payload, 10);
      expect(result).toEqual(searchResults);
    });

    it('should handle single collection in searchByPayload', async () => {
      const payload = { repository: 'my-repo' };
      const collection = 'single-collection';
      const searchResults = [
        { id: '1', payload: { text: 'doc1', repository: 'my-repo' } },
      ];

      mockVectorStoreService.searchByPayload.mockResolvedValue(searchResults);

      const result = await service.searchByPayload(payload, collection);

      expect(mockVectorStoreService.searchByPayload).toHaveBeenCalledWith(collection, payload, 10);
      expect(result).toEqual(searchResults);
    });
  });

  describe('Multi-collection fulltextSearch', () => {
    it('should perform full-text search across multiple collections', async () => {
      const textQuery = 'function test';
      const collections = ['collection1', 'collection2'];
      const fulltextResults = [
        { id: '1', payload: { text: 'function test() {}', filePath: '/src/test.ts' } },
        { id: '2', payload: { text: 'function testHelper() {}', filePath: '/src/helper.ts' } },
      ];

      mockVectorStoreService.fulltextSearch.mockResolvedValue(fulltextResults);

      const result = await service.fulltextSearch(textQuery, collections);

      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        collections,
        textQuery,
        undefined,
        10,
      );
      expect(result).toHaveLength(2);
    });

    it('should perform full-text search with payload filters across collections', async () => {
      const textQuery = 'class';
      const collections = ['collection1', 'collection2'];
      const payload = { language: 'typescript' };
      const fulltextResults = [
        { id: '1', payload: { text: 'class MyClass {}', language: 'typescript' } },
      ];

      mockVectorStoreService.fulltextSearch.mockResolvedValue(fulltextResults);

      const result = await service.fulltextSearch(textQuery, collections, payload, 5);

      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        collections,
        textQuery,
        payload,
        5,
      );
      expect(result).toHaveLength(1);
    });

    it('should handle single collection in fulltextSearch', async () => {
      const textQuery = 'function';
      const collection = 'single-collection';
      const fulltextResults = [
        { id: '1', payload: { text: 'function test() {}' } },
      ];

      mockVectorStoreService.fulltextSearch.mockResolvedValue(fulltextResults);

      const result = await service.fulltextSearch(textQuery, collection);

      expect(mockVectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        collection,
        textQuery,
        undefined,
        10,
      );
      expect(result).toHaveLength(1);
    });
  });
});