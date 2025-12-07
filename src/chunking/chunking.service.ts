import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ts from 'typescript';

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
    this.chunkOverlap = this.configService.get<number>('app.chunking.overlap') || 64;
  }

  async parseFile(content: string, filePath: string): Promise<Chunk[]> {
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

  private createChunkFromNode(node: ts.Node, sourceFile: ts.SourceFile, filePath: string): Chunk | null {
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

    // Check if exported
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        isExported = true;
      }
    }

    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    // Get full text including JSDoc comments if possible
    // Note: getFullText() includes preceding whitespace/comments, getText() does not.
    // We might want to be more selective about comments.
    // For now, let's use getText() but try to grab JSDoc manually if needed,
    // or rely on getFullText() and trim.
    // A simple approach: use getFullText() but trim leading newlines.
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
    const minTokens = 64; // Should be configurable

    for (const chunk of chunks) {
      const tokenCount = this.estimateTokenCount(chunk.content);

      if (tokenCount > this.chunkSize) {
        // If we have a pending group, push it first
        if (currentGroup.length > 0) {
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [];
          currentGroupSize = 0;
        }
        // Split large chunk
        processedChunks.push(...this.splitLargeChunk(chunk));
      } else if (tokenCount < minTokens) {
        // Add to group
        if (currentGroupSize + tokenCount > this.chunkSize) {
          // Group full, push and start new
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [chunk];
          currentGroupSize = tokenCount;
        } else {
          currentGroup.push(chunk);
          currentGroupSize += tokenCount;
        }
      } else {
        // Normal sized chunk
        // If we have a pending group, push it first
        if (currentGroup.length > 0) {
          processedChunks.push(this.mergeChunks(currentGroup));
          currentGroup = [];
          currentGroupSize = 0;
        }
        processedChunks.push(chunk);
      }
    }

    // Push remaining group
    if (currentGroup.length > 0) {
      processedChunks.push(this.mergeChunks(currentGroup));
    }

    return processedChunks;
  }

  private estimateTokenCount(text: string): number {
    // Simple approximation: 1 token ~= 4 chars
    return Math.ceil(text.length / 4);
  }

  private splitLargeChunk(chunk: Chunk): Chunk[] {
    const subChunks: Chunk[] = [];
    const lines = chunk.content.split('\n');
    let currentChunkLines: string[] = [];
    let currentSize = 0;

    // Header to prepend to each sub-chunk (e.g. function signature)
    // For simplicity, we'll just take the first line as header if it looks like a declaration
    const header = lines[0];
    const headerTokens = this.estimateTokenCount(header);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = this.estimateTokenCount(line);

      if (currentSize + lineTokens + headerTokens > this.chunkSize) {
        if (currentChunkLines.length > 0) {
           subChunks.push({
            ...chunk,
            content: (subChunks.length > 0 ? header + '\n' : '') + currentChunkLines.join('\n'),
            // Adjust start/end lines approximately
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
        content: (subChunks.length > 0 ? header + '\n' : '') + currentChunkLines.join('\n'),
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
      content: chunks.map(c => c.content).join('\n\n'),
      isExported: chunks.some(c => c.isExported),
    };
  }
}