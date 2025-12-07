import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { RerankerService } from '../reranker/reranker.service';

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
  };

  const mockRerankerService = {
    isEnabled: jest.fn(),
    rerank: jest.fn(),
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
      { score: 0.9, payload: { content: 'doc1' } },
      { score: 0.8, payload: { content: 'doc2' } },
    ];

    mockEmbeddingService.embedQuery.mockResolvedValue(queryVector);
    mockVectorStoreService.search.mockResolvedValue(searchResults);
    mockRerankerService.isEnabled.mockReturnValue(false);

    const result = await service.search(query);

    const expectedResults = [
      { score: 0.9, content: 'doc1' },
      { score: 0.8, content: 'doc2' },
    ];

    expect(result).toEqual(expectedResults);
    expect(mockEmbeddingService.embedQuery).toHaveBeenCalledWith(query);
    expect(mockVectorStoreService.search).toHaveBeenCalledWith('codebase', queryVector);
    expect(mockRerankerService.rerank).not.toHaveBeenCalled();
  });

  it('should search and rerank when reranker is enabled', async () => {
    const query = 'test query';
    const queryVector = [0.1, 0.2];
    const searchResults = [
      { score: 0.9, payload: { content: 'doc1' } },
      { score: 0.8, payload: { content: 'doc2' } },
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
    expect(result[0].content).toBe('doc2'); // doc2 was index 1, now first
    expect(result[0].score).toBe(0.95);
    expect(result[1].content).toBe('doc1'); // doc1 was index 0, now second
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
});