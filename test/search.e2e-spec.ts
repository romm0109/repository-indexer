import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { VectorStoreService } from './../src/vector-store/vector-store.service';
import { EmbeddingService } from './../src/embedding/embedding.service';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let vectorStoreService: VectorStoreService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingService)
      .useValue({
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      })
      .overrideProvider(VectorStoreService)
      .useValue({
        search: jest.fn().mockResolvedValue([
          {
            id: '1',
            score: 0.9,
            payload: {
              text: 'function hello() { console.log("world"); }',
              filePath: '/src/main.ts',
            },
          },
        ]),
        fulltextSearch: jest.fn().mockResolvedValue([
          {
            id: '1',
            payload: {
              text: 'function hello() { console.log("world"); }',
              filePath: '/src/main.ts',
              language: 'typescript',
            },
          },
          {
            id: '2',
            payload: {
              text: 'function helloWorld() { return "hello"; }',
              filePath: '/src/utils.ts',
              language: 'typescript',
            },
          },
        ]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    vectorStoreService = moduleFixture.get<VectorStoreService>(VectorStoreService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/search/fulltext (POST)', () => {
    it('should return full-text search results', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function hello',
          collectionName: 'test-collection',
        })
        .expect(201);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', '1');
      expect(response.body[0]).toHaveProperty('text');
      expect(response.body[0]).toHaveProperty('filePath', '/src/main.ts');
      expect(vectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        'test-collection',
        'function hello',
        undefined,
        undefined,
      );
    });

    it('should return full-text search results with payload filters', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function',
          collectionName: 'codebase',
          payload: { language: 'typescript' },
          top_k: 5,
        })
        .expect(201);

      expect(response.body).toHaveLength(2);
      expect(vectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        'codebase',
        'function',
        { language: 'typescript' },
        5,
      );
    });

    it('should return empty array when no matches found', async () => {
      (vectorStoreService.fulltextSearch as jest.Mock).mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'nonexistent',
          collectionName: 'codebase',
        })
        .expect(201);

      expect(response.body).toEqual([]);
    });

    it('should return 400 when textQuery is missing', async () => {
      await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          collectionName: 'codebase',
        })
        .expect(400);
    });

    it('should return 400 when collectionName is missing', async () => {
      await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function',
        })
        .expect(400);
    });

    it('should return 400 when both required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({})
        .expect(400);
    });
  });
});