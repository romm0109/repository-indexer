import { IsString, IsOptional, IsObject } from 'class-validator';
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

export class PayloadSearchDto {
  @ApiProperty({ description: 'Name of the Qdrant collection' })
  @IsString()
  collectionName: string;

  @ApiProperty({ description: 'Number of results to return', required: false, default: 10 })
  @IsOptional()
  top_k?: number;

  @ApiProperty({ description: 'Payload data to search for' })
  @IsObject()
  payload: Record<string, any>;
}