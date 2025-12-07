import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { GitlabService } from './../src/gitlab/gitlab.service';
import { EmbeddingService } from './../src/embedding/embedding.service';
import { VectorStoreService } from './../src/vector-store/vector-store.service';

describe('IndexerController (e2e)', () => {
  let app: INestApplication;
  let gitlabService: GitlabService;
  let embeddingService: EmbeddingService;
  let vectorStoreService: VectorStoreService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GitlabService)
      .useValue({
        fetchRepositoryTree: jest.fn().mockResolvedValue([
          { path: 'src/main.ts', type: 'blob' },
        ]),
        fetchFileContent: jest.fn().mockResolvedValue(`
          export function hello() {
            console.log('world');
          }
        `),
      })
      .overrideProvider(EmbeddingService)
      .useValue({
        embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      })
      .overrideProvider(VectorStoreService)
      .useValue({
        createCollection: jest.fn().mockResolvedValue(undefined),
        upsertPoints: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([
            {
                score: 0.9,
                payload: {
                    text: 'hello world'
                }
            }
        ]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gitlabService = moduleFixture.get<GitlabService>(GitlabService);
    embeddingService = moduleFixture.get<EmbeddingService>(EmbeddingService);
    vectorStoreService = moduleFixture.get<VectorStoreService>(VectorStoreService);
  });

  it('/indexer/index (POST)', async () => {
    return request(app.getHttpServer())
      .post('/indexer/index')
      .send({ projectId: '123' })
      .expect(201)
      .expect({ message: 'Indexing started' });
  });

  // Add a small delay to allow async background processing to trigger mocks
  // In a real scenario, we'd want a better way to wait for the background task
  it('should trigger indexing flow', async () => {
    await request(app.getHttpServer())
      .post('/indexer/index')
      .send({ projectId: '123' })
      .expect(201);
    
    // Wait a bit for the background promise to run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(gitlabService.fetchRepositoryTree).toHaveBeenCalledWith('123', '', true);
    expect(gitlabService.fetchFileContent).toHaveBeenCalled();
    expect(vectorStoreService.createCollection).toHaveBeenCalled();
    expect(embeddingService.embedDocuments).toHaveBeenCalled();
    expect(vectorStoreService.upsertPoints).toHaveBeenCalled();
  });

  it('should handle exclusion patterns in /indexer/index', async () => {
    await request(app.getHttpServer())
      .post('/indexer/index')
      .send({ projectId: '123', excludePatterns: ['**/*.spec.ts'] })
      .expect(201);

    // Wait a bit for the background promise to run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(gitlabService.fetchRepositoryTree).toHaveBeenCalledWith('123', '', true);
    // Since our mock returns src/main.ts, it should not be excluded
    expect(gitlabService.fetchFileContent).toHaveBeenCalledWith('123', 'src/main.ts');
  });

  it('/indexer/index-files (POST)', async () => {
    return request(app.getHttpServer())
      .post('/indexer/index-files')
      .send({ projectId: '123', files: ['src/main.ts'] })
      .expect(201)
      .expect({ message: 'Selective indexing started' });
  });

  it('should trigger selective indexing flow', async () => {
    await request(app.getHttpServer())
      .post('/indexer/index-files')
      .send({ projectId: '123', files: ['src/main.ts'] })
      .expect(201);

    // Wait a bit for the background promise to run
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should NOT fetch tree
    expect(gitlabService.fetchRepositoryTree).not.toHaveBeenCalled();
    
    expect(gitlabService.fetchFileContent).toHaveBeenCalledWith('123', 'src/main.ts');
    expect(vectorStoreService.createCollection).toHaveBeenCalled();
    expect(embeddingService.embedDocuments).toHaveBeenCalled();
    expect(vectorStoreService.upsertPoints).toHaveBeenCalled();
  });

  it('should handle exclusion patterns in /indexer/index-files', async () => {
    await request(app.getHttpServer())
      .post('/indexer/index-files')
      .send({
        projectId: '123',
        files: ['src/main.ts', 'src/main.spec.ts'],
        excludePatterns: ['**/*.spec.ts']
      })
      .expect(201);

    // Wait a bit for the background promise to run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(gitlabService.fetchFileContent).toHaveBeenCalledWith('123', 'src/main.ts');
    expect(gitlabService.fetchFileContent).not.toHaveBeenCalledWith('123', 'src/main.spec.ts');
  });
});