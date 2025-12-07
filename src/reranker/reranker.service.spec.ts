import { Test, TestingModule } from '@nestjs/testing';
import { RerankerService } from './reranker.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RerankerService', () => {
  let service: RerankerService;
  let configService: ConfigService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'app.reranker.url') return 'http://reranker';
      if (key === 'app.reranker.apiKey') return 'key';
      if (key === 'app.reranker.modelName') return 'model';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RerankerService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RerankerService>(RerankerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be enabled when config is present', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('should rerank documents correctly', async () => {
    const query = 'test query';
    const documents = ['doc1', 'doc2'];
    const mockResponse = {
      data: {
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.1 },
        ],
      },
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const result = await service.rerank(query, documents);

    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(1);
    expect(result[0].score).toBe(0.9);
    expect(result[1].index).toBe(0);
    expect(result[1].score).toBe(0.1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://reranker/rerank',
      {
        model: 'model',
        query: query,
        documents: documents,
        top_n: undefined,
      },
      expect.any(Object),
    );
  });

  it('should return original order if reranker fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('API Error'));

    const result = await service.rerank('query', ['doc1', 'doc2']);

    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[0].score).toBe(0);
    expect(result[1].index).toBe(1);
    expect(result[1].score).toBe(0);
  });
});

describe('RerankerService Disabled', () => {
  let service: RerankerService;

  const mockConfigDisabled = {
    get: jest.fn(() => null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RerankerService,
        { provide: ConfigService, useValue: mockConfigDisabled },
      ],
    }).compile();

    service = module.get<RerankerService>(RerankerService);
  });

  it('should be disabled when config is missing', () => {
    expect(service.isEnabled()).toBe(false);
  });

  it('should return original order when disabled', async () => {
    const result = await service.rerank('query', ['doc1', 'doc2']);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[0].score).toBe(1);
    expect(result[1].index).toBe(1);
    expect(result[1].score).toBe(1);
  });
});
