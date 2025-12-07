import { Test, TestingModule } from '@nestjs/testing';
import { IndexerService } from './indexer.service';
import { ConfigService } from '@nestjs/config';
import { GitlabService } from '../gitlab/gitlab.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

describe('IndexerService', () => {
  let service: IndexerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexerService,
        { provide: ConfigService, useValue: {} },
        { provide: GitlabService, useValue: {} },
        { provide: ChunkingService, useValue: {} },
        { provide: EmbeddingService, useValue: {} },
        { provide: VectorStoreService, useValue: {} },
      ],
    }).compile();

    service = module.get<IndexerService>(IndexerService);
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
});
