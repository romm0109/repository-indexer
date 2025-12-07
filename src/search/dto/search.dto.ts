import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Name of the Qdrant collection' })
  @IsString()
  collectionName: string;

  @ApiProperty({ description: 'Optional context to refine the search query', required: false })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({ description: 'Number of results to return', required: false, default: 10 })
  @IsOptional()
  top_k?: number;
}