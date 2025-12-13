import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RepositoryType {
  GITLAB = 'gitlab',
  LOCAL = 'local',
}

export class IndexRepoDto {
  @ApiPropertyOptional({
    description: 'Repository type',
    enum: RepositoryType,
    default: RepositoryType.GITLAB,
  })
  @IsOptional()
  @IsEnum(RepositoryType)
  type?: RepositoryType = RepositoryType.GITLAB;

  @ApiPropertyOptional({
    description: 'GitLab Project ID (required if type is gitlab)',
  })
  @ValidateIf((o) => o.type === RepositoryType.GITLAB || !o.type)
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Local filesystem path (required if type is local)',
  })
  @ValidateIf((o) => o.type === RepositoryType.LOCAL)
  @IsString()
  path?: string;

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
