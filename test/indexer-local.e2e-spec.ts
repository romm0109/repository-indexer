import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { LocalRepoService } from './../src/local-repo/local-repo.service';
import { EmbeddingService } from './../src/embedding/embedding.service';
import { ChunkingService } from './../src/chunking/chunking.service';
import { VectorStoreService } from './../src/vector-store/vector-store.service';
import { RepositoryType } from './../src/indexer/dto/index-repo.dto';

describe('IndexerController Local Repo (e2e)', () => {
  let app: INestApplication;
  let localRepoService: LocalRepoService;
  let embeddingService: EmbeddingService;
  let vectorStoreService: VectorStoreService;
  let chunkingService: ChunkingService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LocalRepoService)
      .useValue({
        fetchRepositoryTree: jest
          .fn()
          .mockResolvedValue([{ path: 'src/main.ts', type: 'blob' }]),
        fetchFileContent: jest.fn().mockResolvedValue(`
          console.log('local repo');
        `),
        validatePath: jest.fn(),
      })
      .overrideProvider(ChunkingService)
      .useValue({
        parseFile: jest.fn().mockResolvedValue([
          {
            content: "console.log('local repo');",
            filePath: 'src/main.ts',
            symbolName: 'log',
            symbolKind: 'call',
            startLine: 1,
            endLine: 1,
            isExported: false,
          },
        ]),
      })
      .overrideProvider(EmbeddingService)
      .useValue({
        embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      })
      .overrideProvider(VectorStoreService)
      .useValue({
        createCollection: jest.fn().mockResolvedValue(undefined),
        upsertPoints: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    localRepoService = moduleFixture.get<LocalRepoService>(LocalRepoService);
    embeddingService = moduleFixture.get<EmbeddingService>(EmbeddingService);
    vectorStoreService =
      moduleFixture.get<VectorStoreService>(VectorStoreService);
    chunkingService = moduleFixture.get<ChunkingService>(ChunkingService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/indexer/index (POST) with local type', async () => {
    return request(app.getHttpServer())
      .post('/indexer/index')
      .send({
        type: RepositoryType.LOCAL,
        path: '/validated/path',
        collectionName: 'local-col',
      })
      .expect(201)
      .expect({ message: 'Indexing started' });
  });

  it('should trigger local indexing flow', async () => {
    await request(app.getHttpServer())
      .post('/indexer/index')
      .send({
        type: RepositoryType.LOCAL,
        path: '/validated/path',
        collectionName: 'local-col',
      })
      .expect(201);

    // Wait a bit for the background promise to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localRepoService.fetchRepositoryTree).toHaveBeenCalledWith(
      '/validated/path',
      '',
      true,
    );
    expect(localRepoService.fetchFileContent).toHaveBeenCalledWith(
      '/validated/path',
      'src/main.ts',
    );
    expect(vectorStoreService.createCollection).toHaveBeenCalled();
    expect(embeddingService.embedDocuments).toHaveBeenCalled();
    expect(vectorStoreService.upsertPoints).toHaveBeenCalled();
  });
});
