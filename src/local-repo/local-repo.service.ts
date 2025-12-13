import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RepositorySource,
  RepositoryNode,
} from '../common/interfaces/repository-source.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalRepoService implements RepositorySource {
  private readonly logger = new Logger(LocalRepoService.name);
  private allowedPaths: string[];

  constructor(private configService: ConfigService) {
    const allowed = this.configService.get<string>('ALLOWED_LOCAL_PATHS', '');
    this.allowedPaths = allowed
      .split(',')
      .map((p) => (p.trim() ? path.resolve(p.trim()) : null))
      .filter((p): p is string => !!p);
  }

  private validatePath(targetPath: string) {
    const resolvedPath = path.resolve(targetPath);
    const isAllowed = this.allowedPaths.some((allowed) =>
      resolvedPath.startsWith(allowed),
    );

    if (!isAllowed) {
      this.logger.warn(`Access denied for path: ${resolvedPath}`);
      throw new BadRequestException(
        'Path is not allowed for indexing. Configure ALLOWED_LOCAL_PATHS.',
      );
    }
  }

  async fetchRepositoryTree(
    source: string,
    subPath: string = '',
    recursive: boolean = true,
  ): Promise<RepositoryNode[]> {
    const rootPath = path.resolve(source);
    this.validatePath(rootPath);

    const targetPath = path.join(rootPath, subPath);
    try {
      await fs.access(targetPath);
    } catch {
      throw new NotFoundException(`Path not found: ${targetPath}`);
    }

    const files: RepositoryNode[] = [];

    async function traverse(currentPath: string) {
      if (!recursive && currentPath !== targetPath) {
        return;
      }

      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path
          .relative(rootPath, fullPath)
          .replace(/\\/g, '/');

        if (entry.isDirectory()) {
          files.push({ path: relativePath, type: 'tree' });
          if (recursive) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          files.push({ path: relativePath, type: 'blob' });
        }
      }
    }

    await traverse(targetPath);
    return files;
  }

  async fetchFileContent(source: string, filePath: string): Promise<string> {
    const rootPath = path.resolve(source);
    this.validatePath(rootPath);

    const fullPath = path.join(rootPath, filePath);
    // Ensure the resolved full path is still within the root path (prevent directory traversal)
    if (!path.resolve(fullPath).startsWith(rootPath)) {
      throw new BadRequestException('Invalid file path');
    }

    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new NotFoundException(`File not found: ${fullPath}`);
    }
  }
}
