import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitlabService } from '../gitlab/gitlab.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { v4 as uuidv4 } from 'uuid';
import { minimatch } from 'minimatch';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private configService: ConfigService,
    private gitlabService: GitlabService,
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

  async indexRepository(
    projectId: string,
    collectionName: string,
    excludePatterns: string[] = [],
  ): Promise<void> {
    this.logger.log(`Starting indexing for project ${projectId}`);

    // 1. Fetch file list
    const files = await this.gitlabService.fetchRepositoryTree(
      projectId,
      '',
      true,
    );
    const filesToIndex = files.filter(
      (f: any) =>
        f.type === 'blob' &&
        (f.path.endsWith('.ts') ||
          f.path.endsWith('.tsx') ||
          f.path.endsWith('.yaml') ||
          f.path.endsWith('.yml') ||
          f.path.endsWith('.tpl')) &&
        !this.shouldExclude(f.path, excludePatterns),
    );

    this.logger.log(`Found ${filesToIndex.length} files to index`);

    // Ensure collection exists
    const vectorSize =
      this.configService.get<number>('app.embedding.vectorSize') || 1536;
    await this.vectorStoreService.createCollection(collectionName, vectorSize);

    await this.processFiles(
      projectId,
      collectionName,
      filesToIndex.map((f: any) => f.path),
    );

    this.logger.log(`Indexing completed for project ${projectId}`);
  }

  async indexFiles(
    projectId: string,
    collectionName: string,
    files: string[],
    excludePatterns: string[] = [],
  ): Promise<void> {
    this.logger.log(`Starting selective indexing for project ${projectId}`);

    const filesToIndex = files.filter(
      (path) =>
        (path.endsWith('.ts') ||
          path.endsWith('.tsx') ||
          path.endsWith('.yaml') ||
          path.endsWith('.tpl')) &&
        !this.shouldExclude(path, excludePatterns),
    );

    this.logger.log(`Found ${filesToIndex.length} files to index`);

    // Ensure collection exists
    const vectorSize =
      this.configService.get<number>('app.embedding.vectorSize') || 1536;
    await this.vectorStoreService.createCollection(collectionName, vectorSize);

    await this.processFiles(projectId, collectionName, filesToIndex);

    this.logger.log(`Selective indexing completed for project ${projectId}`);
  }

  private async processFiles(
    projectId: string,
    collectionName: string,
    filePaths: string[],
  ): Promise<void> {
    for (const filePath of filePaths) {
      this.logger.log(`Processing ${filePath}`);
      try {
        // 2. Fetch content
        const content = await this.gitlabService.fetchFileContent(
          projectId,
          filePath,
        );

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
            repo: projectId,
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
