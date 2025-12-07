import { Controller, Post, Body, Query } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('index')
  async indexRepository(
    @Body('projectId') projectId: string,
    @Body('collectionName') collectionName: string,
    @Body('excludePatterns') excludePatterns?: string[],
  ) {
    // Trigger indexing in background
    this.indexerService.indexRepository(projectId, collectionName, excludePatterns);
    return { message: 'Indexing started' };
  }

  @Post('index-files')
  async indexFiles(
    @Body('projectId') projectId: string,
    @Body('collectionName') collectionName: string,
    @Body('files') files: string[],
    @Body('excludePatterns') excludePatterns?: string[],
  ) {
    // Trigger indexing in background
    this.indexerService.indexFiles(projectId, collectionName, files, excludePatterns);
    return { message: 'Selective indexing started' };
  }
}