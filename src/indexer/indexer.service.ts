import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitlabService } from '../gitlab/gitlab.service';
import { LocalRepoService } from '../local-repo/local-repo.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { RepositorySource } from '../common/interfaces/repository-source.interface';
import { RepositoryType, IndexRepoDto } from './dto/index-repo.dto';
import { IndexFilesDto } from './dto/index-files.dto';
import { v4 as uuidv4 } from 'uuid';
import { minimatch } from 'minimatch';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private configService: ConfigService,
    private gitlabService: GitlabService,
    private localRepoService: LocalRepoService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
    private vectorStoreService: VectorStoreService,
  ) {}

  shouldExclude(filePath: string, patterns: string[] = []): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }
    return patterns.some((pattern) => minimatch(filePath, pattern));
  }

  private getProvider(type: RepositoryType): RepositorySource {
    if (type === RepositoryType.LOCAL) {
      return this.localRepoService;
    }
    return this.gitlabService;
  }

  async indexRepository(dto: IndexRepoDto): Promise<void> {
    const type = dto.type || RepositoryType.GITLAB;
    const source = type === RepositoryType.GITLAB ? dto.projectId : dto.path;

    if (!source) {
      throw new BadRequestException(
        `Source is required for type ${type} (projectId or path)`,
      );
    }

    this.logger.log(`Starting indexing for ${type} source: ${source}`);

    const provider = this.getProvider(type);

    // 1. Fetch file list
    const files = await provider.fetchRepositoryTree(source, '', true);
    const filesToIndex = files.filter(
      (f: any) =>
        f.type === 'blob' &&
        (f.path.endsWith('.ts') ||
          f.path.endsWith('.tsx') ||
          f.path.endsWith('.yaml') ||
          f.path.endsWith('.tpl')) &&
        !this.shouldExclude(f.path, dto.excludePatterns),
    );

    this.logger.log(`Found ${filesToIndex.length} files to index`);

    // Ensure collection exists
    const vectorSize =
      this.configService.get<number>('app.embedding.vectorSize') || 1536;
    await this.vectorStoreService.createCollection(
      dto.collectionName,
      vectorSize,
    );

    await this.processFiles(
      provider,
      source,
      dto.collectionName,
      filesToIndex.map((f: any) => f.path),
    );

    this.logger.log(`Indexing completed for ${source}`);
  }

  async indexFiles(dto: IndexFilesDto): Promise<void> {
    const type = dto.type || RepositoryType.GITLAB;
    const source = type === RepositoryType.GITLAB ? dto.projectId : dto.path;

    if (!source) {
      throw new BadRequestException(
        `Source is required for type ${type} (projectId or path)`,
      );
    }

    this.logger.log(`Starting selective indexing for ${source}`);

    const filesToIndex = dto.files.filter(
      (path) =>
        (path.endsWith('.ts') ||
          path.endsWith('.tsx') ||
          path.endsWith('.yaml') ||
          path.endsWith('.tpl')) &&
        !this.shouldExclude(path, dto.excludePatterns),
    );

    this.logger.log(`Found ${filesToIndex.length} files to index`);

    // Ensure collection exists
    const vectorSize =
      this.configService.get<number>('app.embedding.vectorSize') || 1536;
    await this.vectorStoreService.createCollection(
      dto.collectionName,
      vectorSize,
    );

    const provider = this.getProvider(type);
    await this.processFiles(provider, source, dto.collectionName, filesToIndex);

    this.logger.log(`Selective indexing completed for ${source}`);
  }

  private async processFiles(
    provider: RepositorySource,
    source: string,
    collectionName: string,
    filePaths: string[],
  ): Promise<void> {
    for (const filePath of filePaths) {
      this.logger.log(`Processing ${filePath}`);
      try {
        // 2. Fetch content
        const content = await provider.fetchFileContent(source, filePath);

        // 3. Chunk
        const chunks = await this.chunkingService.parseFile(content, filePath);

        if (chunks.length === 0) continue;

        // 4. Embed
        const texts = chunks.map((c) => c.content);
        const embeddings = await this.embeddingService.embedDocuments(texts);

        // 5. Store
        const points = chunks.map((chunk, index) => ({
          id: uuidv4(),
          vector: embeddings[index],
          payload: {
            repo: source,
            file_path: chunk.filePath,
            symbol_name: chunk.symbolName,
            symbol_kind: chunk.symbolKind,
            start_line: chunk.startLine,
            end_line: chunk.endLine,
            text: chunk.content,
            is_exported: chunk.isExported,
          },
        }));

        await this.vectorStoreService.upsertPoints(collectionName, points);
      } catch (e) {
        this.logger.error(`Failed to process ${filePath}: ${e.message}`);
      }
    }
  }
}
