import { Test, TestingModule } from '@nestjs/testing';
import { IndexerService } from './indexer.service';
import { ConfigService } from '@nestjs/config';
import { GitlabService } from '../gitlab/gitlab.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

describe('IndexerService', () => {
  let service: IndexerService;
  let vectorStoreService: VectorStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexerService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: GitlabService, useValue: { fetchFileContent: jest.fn() } },
        { provide: ChunkingService, useValue: { parseFile: jest.fn() } },
        {
          provide: EmbeddingService,
          useValue: { embedDocuments: jest.fn() },
        },
        {
          provide: VectorStoreService,
          useValue: {
            createCollection: jest.fn(),
            upsertPoints: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IndexerService>(IndexerService);
    vectorStoreService = module.get<VectorStoreService>(VectorStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldExclude', () => {
    it('should return false if no patterns are provided', () => {
      expect(service.shouldExclude('src/app.ts', [])).toBe(false);
      expect(service.shouldExclude('src/app.ts', undefined)).toBe(false);
    });

    it('should return true if file matches a pattern', () => {
      expect(service.shouldExclude('src/app.spec.ts', ['**/*.spec.ts'])).toBe(
        true,
      );
      expect(
        service.shouldExclude('node_modules/package/index.js', [
          'node_modules/**',
        ]),
      ).toBe(true);
    });

    it('should return false if file does not match any pattern', () => {
      expect(service.shouldExclude('src/app.ts', ['**/*.spec.ts'])).toBe(false);
      expect(service.shouldExclude('src/utils.ts', ['node_modules/**'])).toBe(
        false,
      );
    });

    it('should handle multiple patterns', () => {
      const patterns = ['**/*.spec.ts', 'node_modules/**'];
      expect(service.shouldExclude('src/app.spec.ts', patterns)).toBe(true);
      expect(
        service.shouldExclude('node_modules/package/index.js', patterns),
      ).toBe(true);
      expect(service.shouldExclude('src/app.ts', patterns)).toBe(false);
    });
  });

  describe('indexFiles', () => {
    it('should correctly filter for ts, tsx, yaml, and tpl files', async () => {
      const files = [
        'src/app.ts',
        'src/app.tsx',
        'src/component.js',
        'config.yaml',
        'template.tpl',
        'README.md',
      ];
      const projectId = '123';
      const collectionName = 'test-collection';

      jest
        .spyOn(vectorStoreService, 'createCollection')
        .mockResolvedValue(undefined);
      const processFilesSpy = jest
        .spyOn(service as any, 'processFiles')
        .mockResolvedValue(undefined);

      await service.indexFiles(projectId, collectionName, files);

      expect(processFilesSpy).toHaveBeenCalledWith(
        projectId,
        collectionName,
        ['src/app.ts', 'src/app.tsx', 'config.yaml', 'template.tpl'],
      );
    });
  });
});
