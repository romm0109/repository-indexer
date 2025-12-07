import { Controller, Post, Body } from '@nestjs/common';
import { SearchService } from './search.service';
import { FulltextSearchDto, PayloadSearchDto, SearchDto } from './dto/search.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Post()
  @ApiOperation({ summary: 'Search for code snippets' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully.' })
  async search(@Body() searchDto: SearchDto) {
    try {
      return this.searchService.search(
        searchDto.query,
        searchDto.collectionName,
        searchDto.prompt,
        searchDto.top_k,
      );
    } catch (error) { }
  }

  @Post('/payload')
  @ApiOperation({ summary: 'Search for code snippets by payload filters' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully.' })
  async searchByPayload(@Body() searchDto: PayloadSearchDto) {
    try {
      return this.searchService.searchByPayload(
        searchDto.payload,
        searchDto.collectionName,
        searchDto.top_k,
      );
    } catch (error) { }
  }

  @Post('/fulltext')
  @ApiOperation({
    summary: 'Full-text search for code snippets',
    description: 'Search for exact or partial text matches within indexed code content. Supports optional payload filters to narrow results by file path, repository, language, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'Full-text search results returned successfully.'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required fields (textQuery or collectionName).'
  })
  async fulltextSearch(@Body() searchDto: FulltextSearchDto) {
    return this.searchService.fulltextSearch(
      searchDto.textQuery,
      searchDto.collectionName,
      searchDto.payload,
      searchDto.top_k,
    );
  }
}