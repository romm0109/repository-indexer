import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexRepoDto {
  @ApiProperty({ description: 'GitLab Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Name of the Qdrant collection' })
  @IsString()
  collectionName: string;

  @ApiPropertyOptional({
    description: 'Glob patterns to exclude from indexing',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}
