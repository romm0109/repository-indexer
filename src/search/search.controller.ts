import { Controller, Post, Body } from '@nestjs/common';
import { SearchService } from './search.service';
import { FulltextSearchDto, PayloadSearchDto, SearchDto } from './dto/search.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Post()
  @ApiOperation({
    summary: 'Semantic search for code snippets',
    description: 'Search for code using vector embeddings. Supports searching across single or multiple collections. Results are automatically deduplicated and ranked by relevance.'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully.',
    schema: {
      example: [
        {
          score: 0.95,
          text: 'function example() { return "hello"; }',
          filePath: '/src/example.ts',
          language: 'typescript'
        }
      ]
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or empty collection array.'
  })
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
  @ApiOperation({
    summary: 'Search for code snippets by payload filters',
    description: 'Search using metadata filters only (no text matching). Supports searching across single or multiple collections. Useful for finding code by file path, language, repository, or other metadata.'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully.',
    schema: {
      example: [
        {
          id: '1',
          text: 'class MyClass {}',
          filePath: '/src/MyClass.ts',
          language: 'typescript',
          repository: 'my-repo'
        }
      ]
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or empty collection array.'
  })
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
    description: 'Search for exact or partial text matches within indexed code content. Supports searching across single or multiple collections. Results are automatically deduplicated. Supports optional payload filters to narrow results by file path, repository, language, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'Full-text search results returned successfully.',
    schema: {
      example: [
        {
          id: '1',
          text: 'function hello() { console.log("world"); }',
          filePath: '/src/main.ts',
          language: 'typescript',
          repository: 'my-repo'
        }
      ]
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required fields (textQuery or collectionName) or empty collection array.'
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