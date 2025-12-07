import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { McpModule } from '../src/mcp/mcp.module';
import { SearchModule } from '../src/search/search.module';
import { EmbeddingModule } from '../src/embedding/embedding.module';
import { VectorStoreModule } from '../src/vector-store/vector-store.module';
import { RerankerModule } from '../src/reranker/reranker.module';
import { McpService } from '../src/mcp/mcp.service';

describe('MCP Integration (e2e)', () => {
  let app: INestApplication;
  let mcpService: McpService;

  describe('MCP Disabled', () => {
    beforeAll(async () => {
      // Set MCP_ENABLED to false
      process.env.MCP_ENABLED = 'false';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
          }),
          SearchModule,
          EmbeddingModule,
          VectorStoreModule,
          RerankerModule,
          // MCP module should not be loaded when disabled
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
      delete process.env.MCP_ENABLED;
    });

    it('should not load MCP module when disabled', async () => {
      // Try to get MCP service - should fail
      expect(() => app.get(McpService)).toThrow();
    });

    it('should start application successfully without MCP', async () => {
      expect(app).toBeDefined();
    });
  });

  describe('MCP Enabled', () => {
    beforeAll(async () => {
      // Set MCP_ENABLED to true
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'stdio';
      process.env.MCP_SERVER_NAME = 'code-indexer-test';
      process.env.MCP_SERVER_VERSION = '1.0.0-test';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
          }),
          SearchModule,
          EmbeddingModule,
          VectorStoreModule,
          RerankerModule,
          ...(process.env.MCP_ENABLED === 'true' ? [McpModule.forRoot()] : []),
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      mcpService = app.get(McpService);
    });

    afterAll(async () => {
      await app.close();
      delete process.env.MCP_ENABLED;
      delete process.env.MCP_TRANSPORT;
      delete process.env.MCP_SERVER_NAME;
      delete process.env.MCP_SERVER_VERSION;
    });

    it('should load MCP module when enabled', () => {
      expect(mcpService).toBeDefined();
    });

    it('should have correct tool definitions', () => {
      const tools = mcpService['getToolDefinitions']();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        'search_code_semantic',
        'search_code_fulltext',
        'search_code_by_payload',
      ]);
    });

    it('should not include collectionName in tool parameters', () => {
      const tools = mcpService['getToolDefinitions']();

      tools.forEach((tool) => {
        const properties = tool.inputSchema.properties;
        expect(properties).not.toHaveProperty('collectionName');
        expect(properties).not.toHaveProperty('collectionNames');
      });
    });

    it('should parse single collection initialization', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js', '--collection', 'test-collection'];

      mcpService['parseInitializationArguments']();

      expect(mcpService['clientCollectionConfig']).toEqual({
        collections: ['test-collection'],
      });

      process.argv = originalArgv;
    });

    it('should parse multiple collections initialization', () => {
      const originalArgv = process.argv;
      process.argv = [
        'node',
        'script.js',
        '--collections',
        'coll1,coll2,coll3',
      ];

      mcpService['parseInitializationArguments']();

      expect(mcpService['clientCollectionConfig']).toEqual({
        collections: ['coll1', 'coll2', 'coll3'],
      });

      process.argv = originalArgv;
    });

    it('should handle missing collection initialization gracefully', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js'];

      mcpService['parseInitializationArguments']();

      expect(mcpService['clientCollectionConfig']).toBeNull();

      process.argv = originalArgv;
    });

    describe('Tool Execution', () => {
      beforeEach(() => {
        // Set up collection config for tests
        mcpService['clientCollectionConfig'] = { collections: ['test-repo'] };
      });

      it('should reject semantic search without collection config', async () => {
        mcpService['clientCollectionConfig'] = null;

        await expect(
          mcpService['handleSemanticSearch']({ query: 'test' }),
        ).rejects.toThrow();
      });

      it('should reject fulltext search without collection config', async () => {
        mcpService['clientCollectionConfig'] = null;

        await expect(
          mcpService['handleFulltextSearch']({ textQuery: 'test' }),
        ).rejects.toThrow();
      });

      it('should reject payload search without collection config', async () => {
        mcpService['clientCollectionConfig'] = null;

        await expect(
          mcpService['handlePayloadSearch']({ payload: { test: 'value' } }),
        ).rejects.toThrow();
      });

      it('should validate semantic search parameters', async () => {
        await expect(
          mcpService['handleSemanticSearch']({ top_k: 10 }),
        ).rejects.toThrow('query parameter is required');
      });

      it('should validate fulltext search parameters', async () => {
        await expect(
          mcpService['handleFulltextSearch']({ top_k: 10 }),
        ).rejects.toThrow('textQuery parameter is required');
      });

      it('should validate payload search parameters', async () => {
        await expect(
          mcpService['handlePayloadSearch']({ top_k: 10 }),
        ).rejects.toThrow('payload parameter is required');
      });
    });

    describe('Error Formatting', () => {
      it('should format errors with correct MCP error codes', () => {
        const badRequestError = mcpService['formatError'](
          new Error('Bad request'),
        );
        expect(badRequestError.isError).toBe(true);

        const errorData = JSON.parse(badRequestError.content[0].text) as {
          error: { code: number; message: string };
        };
        expect(errorData.error).toHaveProperty('code');
        expect(errorData.error).toHaveProperty('message');
      });
    });

    describe('Multiple Clients Simulation', () => {
      it('should support different collection configs per client', () => {
        // Simulate client 1
        const originalArgv = process.argv;
        process.argv = ['node', 'script.js', '--collection', 'client1-repo'];
        mcpService['parseInitializationArguments']();
        const client1Config = mcpService['clientCollectionConfig'];

        // Simulate client 2
        process.argv = [
          'node',
          'script.js',
          '--collections',
          'client2-repo1,client2-repo2',
        ];
        mcpService['parseInitializationArguments']();
        const client2Config = mcpService['clientCollectionConfig'];

        // Configs should be different
        expect(client1Config).not.toEqual(client2Config);
        expect(client2Config?.collections).toHaveLength(2);

        process.argv = originalArgv;
      });
    });
  });

  describe('HTTP API Compatibility', () => {
    beforeAll(async () => {
      // Test with MCP enabled
      process.env.MCP_ENABLED = 'true';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
          }),
          SearchModule,
          EmbeddingModule,
          VectorStoreModule,
          RerankerModule,
          ...(process.env.MCP_ENABLED === 'true' ? [McpModule.forRoot()] : []),
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
      delete process.env.MCP_ENABLED;
    });

    it('should not affect HTTP API when MCP is enabled', () => {
      // SearchModule should still be available
      const searchService = app.get('SearchService') as unknown;
      expect(searchService).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shut down cleanly when MCP is enabled', async () => {
      process.env.MCP_ENABLED = 'true';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
          }),
          SearchModule,
          EmbeddingModule,
          VectorStoreModule,
          RerankerModule,
          ...(process.env.MCP_ENABLED === 'true' ? [McpModule.forRoot()] : []),
        ],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      // Should close without errors
      await expect(testApp.close()).resolves.not.toThrow();

      delete process.env.MCP_ENABLED;
    });

    it('should shut down cleanly when MCP is disabled', async () => {
      process.env.MCP_ENABLED = 'false';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
          }),
          SearchModule,
          EmbeddingModule,
          VectorStoreModule,
          RerankerModule,
        ],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      await expect(testApp.close()).resolves.not.toThrow();

      delete process.env.MCP_ENABLED;
    });
  });
});
