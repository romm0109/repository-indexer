import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepositoryType } from './index-repo.dto';

export class IndexFilesDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @ApiPropertyOptional({
    description: 'Repository type',
    enum: RepositoryType,
    default: RepositoryType.GITLAB,
  })
  @IsOptional()
  @IsEnum(RepositoryType)
  type?: RepositoryType = RepositoryType.GITLAB;

  @ApiPropertyOptional({ description: 'GitLab Project ID' })
  @ValidateIf((o) => o.type === RepositoryType.GITLAB || !o.type)
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Local filesystem path' })
  @ValidateIf((o) => o.type === RepositoryType.LOCAL)
  @IsString()
  path?: string;

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
