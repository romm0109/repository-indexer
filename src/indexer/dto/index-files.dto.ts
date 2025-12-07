import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexFilesDto {
  @ApiProperty({ description: 'GitLab Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Name of the Qdrant collection' })
  @IsString()
  collectionName: string;

  @ApiProperty({ description: 'List of file paths to index', type: [String] })
  @IsArray()
  @IsString({ each: true })
  files: string[];

  @ApiPropertyOptional({
    description: 'Glob patterns to exclude from indexing',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}
