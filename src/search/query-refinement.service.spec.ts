import { Test, TestingModule } from '@nestjs/testing';
import { QueryRefinementService } from './query-refinement.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('QueryRefinementService', () => {
  let service: QueryRefinementService;
  let configService: ConfigService;
  let mockOpenAI: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryRefinementService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'app.refine.url') return 'http://test-url';
              if (key === 'app.refine.apiKey') return 'test-key';
              if (key === 'app.refine.modelName') return 'test-model';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QueryRefinementService>(QueryRefinementService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Access the private openai instance to mock its methods
    mockOpenAI = (service as any).openai;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return original query if API key is missing', async () => {
    // Re-create service with missing API key
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryRefinementService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null),
          },
        },
      ],
    }).compile();
    const serviceNoKey = module.get<QueryRefinementService>(QueryRefinementService);
    
    const result = await serviceNoKey.refineQuery('test', 'context');
    expect(result).toEqual(['test']);
  });

  it('should return refined queries on success', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify(['query1', 'query2']),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const result = await service.refineQuery('test', 'context');
    expect(result).toEqual(['query1', 'query2']);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: expect.stringContaining('test') }),
        ]),
      }),
    );
  });

  it('should handle object response format { queries: [...] }', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({ queries: ['query1', 'query2'] }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const result = await service.refineQuery('test', 'context');
    expect(result).toEqual(['query1', 'query2']);
  });

  it('should fallback to original query on error', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    const result = await service.refineQuery('test', 'context');
    expect(result).toEqual(['test']);
  });

  it('should fallback to original query if LLM returns empty list', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([]),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const result = await service.refineQuery('test', 'context');
    expect(result).toEqual(['test']);
  });
});