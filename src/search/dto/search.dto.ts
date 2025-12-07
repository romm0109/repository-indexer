import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({
    description:
      'Name of the Qdrant collection(s) to search. Can be a single collection name or an array of collection names.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    examples: ['my-collection', ['collection1', 'collection2']],
  })
  @ValidateIf((o) => !Array.isArray(o.collectionName))
  @IsString()
  @ValidateIf((o) => Array.isArray(o.collectionName))
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one collection name must be provided' })
  @IsString({ each: true })
  collectionName: string | string[];

  @ApiProperty({
    description: 'Optional context to refine the search query',
    required: false,
  })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({
    description: 'Number of results to return',
    required: false,
    default: 10,
  })
  @IsOptional()
  top_k?: number;
}

export class PayloadSearchDto {
  @ApiProperty({
    description:
      'Name of the Qdrant collection(s) to search. Can be a single collection name or an array of collection names.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    examples: ['my-collection', ['collection1', 'collection2']],
  })
  @ValidateIf((o) => !Array.isArray(o.collectionName))
  @IsString()
  @ValidateIf((o) => Array.isArray(o.collectionName))
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one collection name must be provided' })
  @IsString({ each: true })
  collectionName: string | string[];

  @ApiProperty({
    description: 'Number of results to return',
    required: false,
    default: 10,
  })
  @IsOptional()
  top_k?: number;

  @ApiProperty({ description: 'Payload data to search for' })
  @IsObject()
  payload: Record<string, any>;
}

export class FulltextSearchDto {
  @ApiProperty({ description: 'Text query to search for in code content' })
  @IsString()
  textQuery: string;

  @ApiProperty({
    description:
      'Name of the Qdrant collection(s) to search. Can be a single collection name or an array of collection names.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    examples: ['my-collection', ['collection1', 'collection2']],
  })
  @ValidateIf((o) => !Array.isArray(o.collectionName))
  @IsString()
  @ValidateIf((o) => Array.isArray(o.collectionName))
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one collection name must be provided' })
  @IsString({ each: true })
  collectionName: string | string[];

  @ApiProperty({
    description:
      'Optional payload filters to narrow results (e.g., file path, repository, language)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;

  @ApiProperty({
    description: 'Number of results to return',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  top_k?: number;
}
