export interface RepositoryNode {
  path: string; // Relative path from the repository root
  type: 'blob' | 'tree';
}

export interface RepositorySource {
  fetchRepositoryTree(
    source: string,
    path?: string,
    recursive?: boolean,
  ): Promise<RepositoryNode[]>;
  fetchFileContent(source: string, filePath: string): Promise<string>;
}
