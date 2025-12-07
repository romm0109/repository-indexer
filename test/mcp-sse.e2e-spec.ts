import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('MCP SSE (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigService>(ConfigService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SSE Transport', () => {
    it('should only be available when MCP is enabled with SSE transport', async () => {
      const mcpEnabled = configService.get('app.mcp.enabled');
      const mcpTransport = configService.get('app.mcp.transport');

      if (!mcpEnabled || mcpTransport !== 'sse') {
        await request(app.getHttpServer())
          .get('/mcp/sse')
          .expect((res) => {
            // When MCP is disabled or using stdio, the endpoint might not exist
            // or might return an error
            expect([404, 500]).toContain(res.status);
          });
      }
    });

    it('should establish SSE connection when enabled', async () => {
      const mcpEnabled = configService.get('app.mcp.enabled');
      const mcpTransport = configService.get('app.mcp.transport');

      if (!mcpEnabled || mcpTransport !== 'sse') {
        return; // Skip test if SSE is not enabled
      }

      const response = await request(app.getHttpServer())
        .get('/mcp/sse')
        .set('Accept', 'text/event-stream')
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      // The response should be an SSE stream
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should reject POST to non-existent session', async () => {
      const mcpEnabled = configService.get('app.mcp.enabled');
      const mcpTransport = configService.get('app.mcp.transport');

      if (!mcpEnabled || mcpTransport !== 'sse') {
        return; // Skip test if SSE is not enabled
      }

      await request(app.getHttpServer())
        .post('/mcp/message/invalid-session-id')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        })
        .expect(404);
    });
  });

  describe('SSE Configuration', () => {
    it('should have correct SSE configuration', () => {
      const sseConfig = configService.get('app.mcp.sse');
      
      expect(sseConfig).toBeDefined();
      expect(sseConfig.endpoint).toBeDefined();
      expect(sseConfig.port).toBeDefined();
      expect(typeof sseConfig.endpoint).toBe('string');
      expect(typeof sseConfig.port).toBe('number');
    });
  });
});