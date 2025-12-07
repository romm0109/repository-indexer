import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitlabService } from '../gitlab/gitlab.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { v4 as uuidv4 } from 'uuid';

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

  async indexRepository(projectId: string, collectionName: string): Promise<void> {
    this.logger.log(`Starting indexing for project ${projectId}`);

    // 1. Fetch file list
    const files = await this.gitlabService.fetchRepositoryTree(projectId, '', true);
    const tsFiles = files.filter((f: any) => f.type === 'blob' && (f.path.endsWith('.ts') || f.path.endsWith('.tsx')));

    this.logger.log(`Found ${tsFiles.length} TypeScript files`);

    // Ensure collection exists
    const vectorSize = this.configService.get<number>('app.embedding.vectorSize') || 1536;
    await this.vectorStoreService.createCollection(collectionName, vectorSize);

    for (const file of tsFiles) {
      this.logger.log(`Processing ${file.path}`);
      try {
        // 2. Fetch content
        const content = await this.gitlabService.fetchFileContent(projectId, file.path);

        // 3. Chunk
        const chunks = await this.chunkingService.parseFile(content, file.path);

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
        this.logger.error(`Failed to process ${file.path}: ${e.message}`);
      }
    }

    this.logger.log(`Indexing completed for project ${projectId}`);
  }
}