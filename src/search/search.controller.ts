import { Controller, Post, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Post()
  async indexRepository(@Body('query') query: string, @Body('collectionName') collectionName: string) {
    try {
      return this.searchService.search(query, collectionName);
    } catch (error) { }

  }
}