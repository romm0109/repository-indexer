import { Controller, Post, Body } from '@nestjs/common';
import { SearchService } from './search.service';
import { PayloadSearchDto, SearchDto } from './dto/search.dto';
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
  @ApiOperation({ summary: 'Search for code snippets' })
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
}