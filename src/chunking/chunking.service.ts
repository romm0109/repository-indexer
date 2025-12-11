import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ts from 'typescript';
import * as yaml from 'yaml';

export interface Chunk {
  filePath: string;
  symbolName: string;
  symbolKind: string;
  startLine: number;
  endLine: number;
  content: string;
  isExported: boolean;
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('app.chunking.size') || 512;
    this.chunkOverlap =
      this.configService.get<number>('app.chunking.overlap') || 64;
  }

  async parseFile(content: string, filePath: string): Promise<Chunk[]> {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return this.parseTypeScriptFile(content, filePath);
      case 'tpl':
        return this.parseTemplateFile(content, filePath);
      case 'yaml':
      case 'yml':
        return this.parseYamlFile(content, filePath);
      default:
        return this.parseGenericFile(content, filePath);
    }
  }

  private async parseTypeScriptFile(
    content: string,
    filePath: string,
  ): Promise<Chunk[]> {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
    );

    const chunks: Chunk[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isVariableStatement(node)
      ) {
        const chunk = this.createChunkFromNode(node, sourceFile, filePath);
        if (chunk) {
          chunks.push(chunk);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return this.processChunks(chunks);
  }

  private parseTemplateFile(content: string, filePath: string): Chunk[] {
    const chunks: Chunk[] = [];
    const lines = content.split('\n');
    
    // Pattern to detect template blocks/sections
    const blockPatterns = [
      { regex: /^{{-?\s*define\s+"([^"]+)"/, type: 'template-define' },
      { regex: /^{{-?\s*block\s+"([^"]+)"/, type: 'template-block' },
      { regex: /^{{-?\s*template\s+"([^"]+)"/, type: 'template-section' },
      { regex: /^#\s*(.+)$/, type: 'template-comment-section' },
    ];

    let currentBlock: {
      name: string;
      type: string;
      startLine: number;
      lines: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for block start
      for (const pattern of blockPatterns) {
        const match = trimmedLine.match(pattern.regex);
        if (match) {
          // Save previous block if exists
          if (currentBlock) {
            chunks.push({
              filePath,
              symbolName: currentBlock.name,
              symbolKind: currentBlock.type,
              startLine: currentBlock.startLine,
              endLine: i,
              content: currentBlock.lines.join('\n'),
              isExported: false,
            });
          }

          // Start new block
          currentBlock = {
            name: match[1] || `section-${i + 1}`,
            type: pattern.type,
            startLine: i + 1,
            lines: [line],
          };
          break;
        }
      }

      // Check for block end
      if (currentBlock && trimmedLine.match(/^{{-?\s*end\s*-?}}/)) {
        currentBlock.lines.push(line);
        chunks.push({
          filePath,
          symbolName: currentBlock.name,
          symbolKind: currentBlock.type,
          startLine: currentBlock.startLine,
          endLine: i + 1,
          content: currentBlock.lines.join('\n'),
          isExported: false,
        });
        currentBlock = null;
      } else if (currentBlock) {
        currentBlock.lines.push(line);
      }
    }

    // Save last block if exists
    if (currentBlock) {
      chunks.push({
        filePath,
        symbolName: currentBlock.name,
        symbolKind: currentBlock.type,
        startLine: currentBlock.startLine,
        endLine: lines.length,
        content: currentBlock.lines.join('\n'),
        isExported: false,
      });
    }

    // If no blocks found, treat as single chunk
    if (chunks.length === 0) {
      chunks.push({
        filePath,
        symbolName: 'template',
        symbolKind: 'template-file',
        startLine: 1,
        endLine: lines.length,
        content,
        isExported: false,
      });
    }

    return this.processChunks(chunks);
  }

  private parseYamlFile(content: string, filePath: string): Chunk[] {
    const chunks: Chunk[] = [];
    const lines = content.split('\n');

    try {
      const doc = yaml.parseDocument(content);
      
      // Extract top-level keys as separate chunks
      if (doc.contents && yaml.isMap(doc.contents)) {
        for (const pair of doc.contents.items) {
          if (yaml.isScalar(pair.key)) {
            const keyName = String(pair.key.value);
            const range = pair.value?.range;
            
            if (range) {
              const startPos = this.getLineFromPosition(content, range[0]);
              const endPos = this.getLineFromPosition(content, range[1]);
              
              // Extract the content for this key
              const keyContent = lines
                .slice(startPos - 1, endPos)
                .join('\n');

              chunks.push({
                filePath,
                symbolName: keyName,
                symbolKind: 'yaml-key',
                startLine: startPos,
                endLine: endPos,
                content: keyContent,
                isExported: false,
              });
            }
          }
        }
      }
    } catch (error) {
      // If YAML parsing fails, fall back to simple line-based chunking
      console.warn(`YAML parsing failed for ${filePath}, using fallback`);
    }

    // If no chunks found or parsing failed, use indentation-based chunking
    if (chunks.length === 0) {
      let currentSection: {
        name: string;
        startLine: number;
        lines: string[];
      } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip empty lines and comments at root level
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          if (currentSection) {
            currentSection.lines.push(line);
          }
          continue;
        }

        // Detect top-level keys (no leading whitespace before key)
        if (line.match(/^[a-zA-Z_][\w-]*:/)) {
          // Save previous section
          if (currentSection) {
            chunks.push({
              filePath,
              symbolName: currentSection.name,
              symbolKind: 'yaml-section',
              startLine: currentSection.startLine,
              endLine: i,
              content: currentSection.lines.join('\n'),
              isExported: false,
            });
          }

          // Start new section
          const keyMatch = line.match(/^([a-zA-Z_][\w-]*):/);
          currentSection = {
            name: keyMatch ? keyMatch[1] : `section-${i + 1}`,
            startLine: i + 1,
            lines: [line],
          };
        } else if (currentSection) {
          currentSection.lines.push(line);
        }
      }

      // Save last section
      if (currentSection) {
        chunks.push({
          filePath,
          symbolName: currentSection.name,
          symbolKind: 'yaml-section',
          startLine: currentSection.startLine,
          endLine: lines.length,
          content: currentSection.lines.join('\n'),
          isExported: false,
        });
      }
    }

    // If still no chunks, treat entire file as one chunk
    if (chunks.length === 0) {
      chunks.push({
        filePath,
        symbolName: 'yaml-config',
        symbolKind: 'yaml-file',
        startLine: 1,
        endLine: lines.length,
        content,
        isExported: false,
      });
    }

    return this.processChunks(chunks);
  }

  private parseGenericFile(content: string, filePath: string): Chunk[] {
    const lines = content.split('\n');
    return this.processChunks([
      {
        filePath,
        symbolName: 'content',
        symbolKind: 'file',
        startLine: 1,
        endLine: lines.length,
        content,
        isExported: false,
      },
    ]);
  }

  private getLineFromPosition(content: string, position: number): number {
    const upToPosition = content.substring(0, position);
    return upToPosition.split('\n').length;
  }

  private createChunkFromNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
  ): Chunk | null {
    let name = 'anonymous';
    let kind = 'unknown';
    let isExported = false;

    if (ts.isFunctionDeclaration(node)) {
      name = node.name?.getText(sourceFile) || 'anonymous';
      kind = 'function';
    } else if (ts.isClassDeclaration(node)) {
      name = node.name?.getText(sourceFile) || 'anonymous';
      kind = 'class';
    } else if (ts.isInterfaceDeclaration(node)) {
      name = node.name?.getText(sourceFile) || 'anonymous';
      kind = 'interface';
    } else if (ts.isTypeAliasDeclaration(node)) {
      name = node.name?.getText(sourceFile) || 'anonymous';
      kind = 'type';
    } else if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && declaration.name) {
        name = declaration.name.getText(sourceFile);
        kind = 'variable';
      }
    }

    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        isExported = true;
      }
    }

    const start = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const content = node.getFullText(sourceFile).trim();

    return {
      filePath,
      symbolName: name,
      symbolKind: kind,
      startLine: start.line + 1,
      endLine: end.line + 1,
      content,
      isExported,
    };
  }

  private processChunks(chunks: Chunk[]): Chunk[] {
    const processedChunks: Chunk[] = [];
    let currentGroup: Chunk[] = [];
    let currentGroupSize = 0;
    const minTokens = 64;

    for (const chunk of chunks) {
      const tokenCount = this.estimateTokenCount(chunk.content);

      if (tokenCount > this.chunkSize) {
        if (currentGroup.length > 0) {
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [];
          currentGroupSize = 0;
        }
        processedChunks.push(...this.splitLargeChunk(chunk));
      } else if (tokenCount < minTokens) {
        if (currentGroupSize + tokenCount > this.chunkSize) {
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [chunk];
          currentGroupSize = tokenCount;
        } else {
          currentGroup.push(chunk);
          currentGroupSize += tokenCount;
        }
      } else {
        if (currentGroup.length > 0) {
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [];
          currentGroupSize = 0;
        }
        processedChunks.push(chunk);
      }
    }

    if (currentGroup.length > 0) {
      processedChunks.push(this.mergeChunks(currentGroup));
    }

    return processedChunks;
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private splitLargeChunk(chunk: Chunk): Chunk[] {
    const subChunks: Chunk[] = [];
    const lines = chunk.content.split('\n');
    let currentChunkLines: string[] = [];
    let currentSize = 0;

    const header = lines[0];
    const headerTokens = this.estimateTokenCount(header);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = this.estimateTokenCount(line);

      if (currentSize + lineTokens + headerTokens > this.chunkSize) {
        if (currentChunkLines.length > 0) {
          subChunks.push({
            ...chunk,
            content:
              (subChunks.length > 0 ? header + '\n' : '') +
              currentChunkLines.join('\n'),
            startLine: chunk.startLine + i - currentChunkLines.length,
            endLine: chunk.startLine + i,
          });
        }
        currentChunkLines = [line];
        currentSize = lineTokens;
      } else {
        currentChunkLines.push(line);
        currentSize += lineTokens;
      }
    }

    if (currentChunkLines.length > 0) {
      subChunks.push({
        ...chunk,
        content:
          (subChunks.length > 0 ? header + '\n' : '') +
          currentChunkLines.join('\n'),
        endLine: chunk.endLine,
      });
    }

    return subChunks;
  }

  private mergeChunks(chunks: Chunk[]): Chunk {
    if (chunks.length === 0) {
      throw new Error('Cannot merge empty chunks');
    }
    if (chunks.length === 1) return chunks[0];

    const first = chunks[0];
    const last = chunks[chunks.length - 1];

    return {
      filePath: first.filePath,
      symbolName: `${first.symbolName} - ${last.symbolName}`,
      symbolKind: 'group',
      startLine: first.startLine,
      endLine: last.endLine,
      content: chunks.map((c) => c.content).join('\n\n'),
      isExported: chunks.some((c) => c.isExported),
    };
  }
}