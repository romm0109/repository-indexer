import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  RepositorySource,
  RepositoryNode,
} from '../common/interfaces/repository-source.interface';

@Injectable()
export class GitlabService implements RepositorySource {
  private readonly gitlabUrl: string;
  private readonly gitlabToken: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.gitlabUrl =
      this.configService.get<string>('app.gitlab.url') ?? 'https://gitlab.com';
    this.gitlabToken = this.configService.get<string>('app.gitlab.token') ?? '';

    this.axiosInstance = axios.create({
      baseURL: this.gitlabUrl,
      headers: {
        'PRIVATE-TOKEN': this.gitlabToken,
      },
    });
  }

  async fetchRepositoryTree(
    projectId: string,
    path: string = '',
    recursive: boolean = true,
  ): Promise<RepositoryNode[]> {
    try {
      const response = await this.axiosInstance.get(
        `/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree`,
        {
          params: {
            path,
            recursive,
            per_page: 100, // Adjust pagination as needed
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch repository tree: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchFileContent(projectId: string, filePath: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(
        `/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}/raw`,
        {
          params: {
            ref: 'main', // Default to main, could be parameterized
          },
          responseType: 'text',
        },
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch file content: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
