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
        searchByPayload: jest.fn().mockResolvedValue([
          {
            id: '1',
            payload: {
              text: 'function test() {}',
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

  describe('/search/fulltext (POST) - Multi-collection', () => {
    it('should accept array of collection names', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function hello',
          collectionName: ['collection1', 'collection2'],
        })
        .expect(201);

      expect(response.body).toHaveLength(2);
      expect(vectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        ['collection1', 'collection2'],
        'function hello',
        undefined,
        undefined,
      );
    });

    it('should accept array of collection names with payload filters', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'class',
          collectionName: ['repo1', 'repo2', 'repo3'],
          payload: { language: 'typescript' },
          top_k: 5,
        })
        .expect(201);

      expect(response.body).toHaveLength(2);
      expect(vectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        ['repo1', 'repo2', 'repo3'],
        'class',
        { language: 'typescript' },
        5,
      );
    });

    it('should return 400 when collectionName is empty array', async () => {
      await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function',
          collectionName: [],
        })
        .expect(400);
    });

    it('should maintain backward compatibility with single collection string', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/fulltext')
        .send({
          textQuery: 'function',
          collectionName: 'single-collection',
        })
        .expect(201);

      expect(response.body).toHaveLength(2);
      expect(vectorStoreService.fulltextSearch).toHaveBeenCalledWith(
        'single-collection',
        'function',
        undefined,
        undefined,
      );
    });
  });

  describe('/search (POST) - Multi-collection semantic search', () => {
    it('should accept array of collection names for semantic search', async () => {
      const response = await request(app.getHttpServer())
        .post('/search')
        .send({
          query: 'test query',
          collectionName: ['collection1', 'collection2'],
        })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(vectorStoreService.search).toHaveBeenCalledWith(
        ['collection1', 'collection2'],
        [0.1, 0.2, 0.3],
        undefined,
      );
    });

    it('should accept array of collection names with top_k', async () => {
      const response = await request(app.getHttpServer())
        .post('/search')
        .send({
          query: 'test query',
          collectionName: ['repo1', 'repo2'],
          top_k: 5,
        })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(vectorStoreService.search).toHaveBeenCalledWith(
        ['repo1', 'repo2'],
        [0.1, 0.2, 0.3],
        5,
      );
    });

    it('should return 400 when collectionName is empty array', async () => {
      await request(app.getHttpServer())
        .post('/search')
        .send({
          query: 'test query',
          collectionName: [],
        })
        .expect(400);
    });
  });

  describe('/search/payload (POST) - Multi-collection payload search', () => {
    it('should accept array of collection names for payload search', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/payload')
        .send({
          collectionName: ['collection1', 'collection2'],
          payload: { language: 'typescript' },
        })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(vectorStoreService.searchByPayload).toHaveBeenCalledWith(
        ['collection1', 'collection2'],
        { language: 'typescript' },
        undefined,
      );
    });

    it('should accept array of collection names with top_k', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/payload')
        .send({
          collectionName: ['repo1', 'repo2', 'repo3'],
          payload: { repository: 'my-repo' },
          top_k: 20,
        })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(vectorStoreService.searchByPayload).toHaveBeenCalledWith(
        ['repo1', 'repo2', 'repo3'],
        { repository: 'my-repo' },
        20,
      );
    });

    it('should return 400 when collectionName is empty array', async () => {
      await request(app.getHttpServer())
        .post('/search/payload')
        .send({
          collectionName: [],
          payload: { language: 'typescript' },
        })
        .expect(400);
    });

    it('should maintain backward compatibility with single collection', async () => {
      const response = await request(app.getHttpServer())
        .post('/search/payload')
        .send({
          collectionName: 'single-collection',
          payload: { language: 'typescript' },
        })
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(vectorStoreService.searchByPayload).toHaveBeenCalledWith(
        'single-collection',
        { language: 'typescript' },
        undefined,
      );
    });
  });
});