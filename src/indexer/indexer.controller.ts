import { Controller, Post, Body, Query } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('index')
  async indexRepository(@Body('projectId') projectId: string, @Body('collectionName') collectionName: string) {
    // Trigger indexing in background
    this.indexerService.indexRepository(projectId, collectionName);
    return { message: 'Indexing started' };
  }
}