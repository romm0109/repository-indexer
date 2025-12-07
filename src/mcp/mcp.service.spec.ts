import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { McpService } from './mcp.service';
import { SearchService } from '../search/search.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('McpService', () => {
  let service: McpService;

  const mockSearchService = {
    search: jest.fn(),
    fulltextSearch: jest.fn(),
    searchByPayload: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Default config - MCP disabled
    mockConfigService.get.mockReturnValue({
      enabled: false,
      transport: 'stdio',
      name: 'code-indexer',
      version: '1.0.0',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<McpService>(McpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should not initialize MCP server when disabled', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: false,
        transport: 'stdio',
        name: 'code-indexer',
        version: '1.0.0',
      });

      await service.onModuleInit();

      // Service should initialize without error
      expect(service).toBeDefined();
    });

    it('should log when MCP is disabled', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith('MCP server is disabled');
    });
  });

  describe('parseInitializationArguments', () => {
    it('should parse single collection from --collection argument', () => {
      // Mock process.argv
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js', '--collection', 'my-repo'];

      service['parseInitializationArguments']();

      expect(service['clientCollectionConfig']).toEqual({
        collections: ['my-repo'],
      });

      // Restore
      process.argv = originalArgv;
    });

    it('should parse multiple collections from --collections argument', () => {
      const originalArgv = process.argv;
      process.argv = [
        'node',
        'script.js',
        '--collections',
        'repo1,repo2,repo3',
      ];

      service['parseInitializationArguments']();

      expect(service['clientCollectionConfig']).toEqual({
        collections: ['repo1', 'repo2', 'repo3'],
      });

      process.argv = originalArgv;
    });

    it('should handle both --collection and --collections (collections takes precedence)', () => {
      const originalArgv = process.argv;
      process.argv = [
        'node',
        'script.js',
        '--collection',
        'single',
        '--collections',
        'multi1,multi2',
      ];

      service['parseInitializationArguments']();

      expect(service['clientCollectionConfig']).toEqual({
        collections: ['single', 'multi1', 'multi2'],
      });

      process.argv = originalArgv;
    });

    it('should warn when no collection arguments provided', () => {
      const originalArgv = process.argv;
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      process.argv = ['node', 'script.js'];

      service['parseInitializationArguments']();

      expect(service['clientCollectionConfig']).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        'No collection configuration provided via initialization arguments',
      );

      process.argv = originalArgv;
    });
  });

  describe('getToolDefinitions', () => {
    it('should return three tool definitions', () => {
      const tools = service['getToolDefinitions']();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        'search_code_semantic',
        'search_code_fulltext',
        'search_code_by_payload',
      ]);
    });

    it('should not include collectionName in tool parameters', () => {
      const tools = service['getToolDefinitions']();

      tools.forEach((tool) => {
        const properties = tool.inputSchema.properties;
        expect(properties).not.toHaveProperty('collectionName');
        expect(properties).not.toHaveProperty('collectionNames');
      });
    });

    it('should have correct required parameters for semantic search', () => {
      const tools = service['getToolDefinitions']();
      const semanticTool = tools.find((t) => t.name === 'search_code_semantic');

      expect(semanticTool?.inputSchema.required).toEqual(['query']);
      expect(semanticTool?.inputSchema.properties).toHaveProperty('query');
      expect(semanticTool?.inputSchema.properties).toHaveProperty('top_k');
      // prompt is optional, so it may or may not be in properties
    });

    it('should have correct required parameters for fulltext search', () => {
      const tools = service['getToolDefinitions']();
      const fulltextTool = tools.find((t) => t.name === 'search_code_fulltext');

      expect(fulltextTool?.inputSchema.required).toEqual(['textQuery']);
      expect(fulltextTool?.inputSchema.properties).toHaveProperty('textQuery');
      expect(fulltextTool?.inputSchema.properties).toHaveProperty('payload');
      expect(fulltextTool?.inputSchema.properties).toHaveProperty('top_k');
    });

    it('should have correct required parameters for payload search', () => {
      const tools = service['getToolDefinitions']();
      const payloadTool = tools.find(
        (t) => t.name === 'search_code_by_payload',
      );

      expect(payloadTool?.inputSchema.required).toEqual(['payload']);
      expect(payloadTool?.inputSchema.properties).toHaveProperty('payload');
      expect(payloadTool?.inputSchema.properties).toHaveProperty('top_k');
    });
  });

  describe('handleSemanticSearch', () => {
    beforeEach(() => {
      // Set up client collection config
      service['clientCollectionConfig'] = { collections: ['test-repo'] };
    });

    it('should call searchService.search with correct parameters for single collection', async () => {
      const mockResults = [{ score: 0.9, text: 'test code' }];
      mockSearchService.search.mockResolvedValue(mockResults);

      const args = { query: 'test query', top_k: 5 };
      const result = await service['handleSemanticSearch'](args);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        'test query',
        'test-repo',
        undefined,
        5,
      );
      expect(result.content[0].text).toContain('test code');
    });

    it('should use multiple collections when configured', async () => {
      service['clientCollectionConfig'] = {
        collections: ['repo1', 'repo2', 'repo3'],
      };
      const mockResults = [{ score: 0.9, text: 'test code' }];
      mockSearchService.search.mockResolvedValue(mockResults);

      const args = { query: 'test query', top_k: 10 };
      await service['handleSemanticSearch'](args);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        'test query',
        ['repo1', 'repo2', 'repo3'],
        undefined,
        10,
      );
    });

    it('should pass prompt parameter when provided', async () => {
      const mockResults = [{ score: 0.9, text: 'test code' }];
      mockSearchService.search.mockResolvedValue(mockResults);

      const args = {
        query: 'test query',
        prompt: 'context prompt',
        top_k: 10,
      };
      await service['handleSemanticSearch'](args);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        'test query',
        'test-repo',
        'context prompt',
        10,
      );
    });

    it('should use default top_k of 10 when not provided', async () => {
      const mockResults = [{ score: 0.9, text: 'test code' }];
      mockSearchService.search.mockResolvedValue(mockResults);

      const args = { query: 'test query' };
      await service['handleSemanticSearch'](args);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        'test query',
        'test-repo',
        undefined,
        10,
      );
    });

    it('should throw error when collection not configured', async () => {
      service['clientCollectionConfig'] = null;

      const args = { query: 'test query' };

      await expect(service['handleSemanticSearch'](args)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw error when query is missing', async () => {
      const args = { top_k: 10 };

      await expect(service['handleSemanticSearch'](args)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when query is not a string', async () => {
      const args = { query: 123, top_k: 10 };

      await expect(service['handleSemanticSearch'](args)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleFulltextSearch', () => {
    beforeEach(() => {
      service['clientCollectionConfig'] = { collections: ['test-repo'] };
    });

    it('should call searchService.fulltextSearch with correct parameters', async () => {
      const mockResults = [{ id: '1', text: 'test code' }];
      mockSearchService.fulltextSearch.mockResolvedValue(mockResults);

      const args = { textQuery: 'function test', top_k: 5 };
      const result = await service['handleFulltextSearch'](args);

      expect(mockSearchService.fulltextSearch).toHaveBeenCalledWith(
        'function test',
        'test-repo',
        undefined,
        5,
      );
      expect(result.content[0].text).toContain('test code');
    });

    it('should pass payload filters when provided', async () => {
      const mockResults = [{ id: '1', text: 'test code' }];
      mockSearchService.fulltextSearch.mockResolvedValue(mockResults);

      const args = {
        textQuery: 'function test',
        payload: { language: 'typescript' },
        top_k: 10,
      };
      await service['handleFulltextSearch'](args);

      expect(mockSearchService.fulltextSearch).toHaveBeenCalledWith(
        'function test',
        'test-repo',
        { language: 'typescript' },
        10,
      );
    });

    it('should throw error when collection not configured', async () => {
      service['clientCollectionConfig'] = null;

      const args = { textQuery: 'test' };

      await expect(service['handleFulltextSearch'](args)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw error when textQuery is missing', async () => {
      const args = { top_k: 10 };

      await expect(service['handleFulltextSearch'](args)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handlePayloadSearch', () => {
    beforeEach(() => {
      service['clientCollectionConfig'] = { collections: ['test-repo'] };
    });

    it('should call searchService.searchByPayload with correct parameters', async () => {
      const mockResults = [{ id: '1', text: 'test code' }];
      mockSearchService.searchByPayload.mockResolvedValue(mockResults);

      const args = { payload: { filePath: '/src/*' }, top_k: 5 };
      const result = await service['handlePayloadSearch'](args);

      expect(mockSearchService.searchByPayload).toHaveBeenCalledWith(
        { filePath: '/src/*' },
        'test-repo',
        5,
      );
      expect(result.content[0].text).toContain('test code');
    });

    it('should throw error when collection not configured', async () => {
      service['clientCollectionConfig'] = null;

      const args = { payload: { filePath: '/src/*' } };

      await expect(service['handlePayloadSearch'](args)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw error when payload is missing', async () => {
      const args = { top_k: 10 };

      await expect(service['handlePayloadSearch'](args)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when payload is not an object', async () => {
      const args = { payload: 'not an object', top_k: 10 };

      await expect(service['handlePayloadSearch'](args)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('formatError', () => {
    it('should format BadRequestException with code -32602', () => {
      const error = new BadRequestException('Invalid parameters');
      const result = service['formatError'](error);

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0].text) as {
        error: { code: number; message: string };
      };
      expect(errorData.error.code).toBe(-32602);
      expect(errorData.error.message).toBe('Invalid parameters');
    });

    it('should format NotFoundException with code -32001', () => {
      const error = new NotFoundException('Resource not found');
      const result = service['formatError'](error);

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0].text) as {
        error: { code: number; message: string };
      };
      expect(errorData.error.code).toBe(-32001);
      expect(errorData.error.message).toBe('Resource not found');
    });

    it('should format InternalServerErrorException with code -32603', () => {
      const error = new InternalServerErrorException('Internal error');
      const result = service['formatError'](error);

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0].text) as {
        error: { code: number; message: string };
      };
      expect(errorData.error.code).toBe(-32603);
      expect(errorData.error.message).toBe('Internal error');
    });

    it('should format generic errors with code -32603', () => {
      const error = new Error('Unknown error');
      const result = service['formatError'](error);

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0].text) as {
        error: { code: number; message: string };
      };
      expect(errorData.error.code).toBe(-32603);
      expect(errorData.error.message).toBe('Unknown error');
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle graceful shutdown when server is not initialized', async () => {
      await service.onModuleDestroy();
      // Should not throw
      expect(service).toBeDefined();
    });
  });
});
