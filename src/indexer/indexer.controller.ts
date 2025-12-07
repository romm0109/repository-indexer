import { Controller, Post, Body } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { IndexRepoDto } from './dto/index-repo.dto';
import { IndexFilesDto } from './dto/index-files.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('indexer')
@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('index')
  @ApiOperation({ summary: 'Index a GitLab repository' })
  @ApiResponse({ status: 201, description: 'Indexing started successfully.' })
  async indexRepository(@Body() indexRepoDto: IndexRepoDto) {
    // Trigger indexing in background
    this.indexerService.indexRepository(
      indexRepoDto.projectId,
      indexRepoDto.collectionName,
      indexRepoDto.excludePatterns,
    );
    return { message: 'Indexing started' };
  }

  @Post('index-files')
  @ApiOperation({ summary: 'Index specific files from a GitLab repository' })
  @ApiResponse({
    status: 201,
    description: 'Selective indexing started successfully.',
  })
  async indexFiles(@Body() indexFilesDto: IndexFilesDto) {
    // Trigger indexing in background
    this.indexerService.indexFiles(
      indexFilesDto.projectId,
      indexFilesDto.collectionName,
      indexFilesDto.files,
      indexFilesDto.excludePatterns,
    );
    return { message: 'Selective indexing started' };
  }
}
