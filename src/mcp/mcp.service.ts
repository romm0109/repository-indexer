import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';
import { SearchService } from '../search/search.service';

interface McpConfig {
  enabled: boolean;
  transport: string;
  name: string;
  version: string;
  sse: {
    endpoint: string;
    port: number;
  };
}

interface ClientCollectionConfig {
  collections: string[];
}

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private server: Server | null = null;
  private transport: StdioServerTransport | SSEServerTransport | null = null;
  private mcpConfig: McpConfig;
  private clientCollectionConfig: ClientCollectionConfig | null = null;
  private sseTransports: Map<string, SSEServerTransport> = new Map();
  private sseSendCallbacks: Map<string, (message: string) => void> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly searchService: SearchService,
  ) {
    this.mcpConfig = this.configService.get<McpConfig>('app.mcp')!;
  }

  async onModuleInit() {
    if (!this.mcpConfig.enabled) {
      this.logger.log('MCP server is disabled');
      return;
    }

    this.logger.log('Initializing MCP server...');

    try {
      // Parse initialization arguments for collection configuration
      this.parseInitializationArguments();

      // Create MCP server
      this.server = new Server(
        {
          name: this.mcpConfig.name,
          version: this.mcpConfig.version,
        },
        {
          capabilities: {
            tools: {},
          },
        },
      );

      // Register tool handlers
      this.registerToolHandlers();

      // Set up transport
      if (this.mcpConfig.transport === 'stdio') {
        this.transport = new StdioServerTransport();
        await this.server.connect(this.transport);
        this.logger.log('MCP server started on stdio transport');
      } else if (this.mcpConfig.transport === 'sse') {
        // For SSE, we don't connect a transport here
        // Each SSE session will create its own transport in registerSseSession
        this.logger.log(
          `MCP server ready for SSE transport on ${this.mcpConfig.sse.endpoint}`,
        );
      } else {
        throw new Error(`Unsupported transport: ${this.mcpConfig.transport}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize MCP server', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.server) {
      this.logger.log('Shutting down MCP server...');
      
      // Close all SSE transports
      for (const [sessionId, transport] of this.sseTransports.entries()) {
        try {
          await transport.close();
          this.logger.log(`Closed SSE transport for session: ${sessionId}`);
        } catch (error) {
          this.logger.error(
            `Error closing SSE transport for session ${sessionId}`,
            error,
          );
        }
      }
      this.sseTransports.clear();
      this.sseSendCallbacks.clear();

      await this.server.close();
      this.server = null;
      this.transport = null;
      this.logger.log('MCP server shut down successfully');
    }
  }

  /**
   * Register a new SSE session and create transport
   */
  async registerSseSession(sessionId: string, res: any) {
    this.logger.log(`Registering SSE session: ${sessionId}`);

    // Create a new SSE transport for this session
    const sseTransport = new SSEServerTransport(
      this.mcpConfig.sse.endpoint,
      res,
    );

    this.sseTransports.set(sessionId, sseTransport);

    // Start the SSE connection
    await sseTransport.start();

    // Connect the transport to the server
    if (this.server && this.mcpConfig.transport === 'sse') {
      await this.server.connect(sseTransport);
      this.logger.log(`SSE transport connected for session: ${sessionId}`);
    }

    return sseTransport;
  }

  /**
   * Unregister an SSE session
   */
  async unregisterSseSession(sessionId: string) {
    this.logger.log(`Unregistering SSE session: ${sessionId}`);
    
    const transport = this.sseTransports.get(sessionId);
    if (transport) {
      try {
        await transport.close();
      } catch (error) {
        this.logger.error(
          `Error closing SSE transport for session ${sessionId}`,
          error,
        );
      }
      this.sseTransports.delete(sessionId);
    }
  }

  /**
   * Handle incoming SSE POST message from client
   */
  async handleSsePostMessage(sessionId: string, req: any, res: any, body?: unknown) {
    const transport = this.sseTransports.get(sessionId);
    if (!transport) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    try {
      await transport.handlePostMessage(req, res, body);
    } catch (error) {
      this.logger.error(
        `Error handling SSE POST message for session ${sessionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get SSE transport by session ID
   */
  getSseTransport(sessionId: string): SSEServerTransport | undefined {
    return this.sseTransports.get(sessionId);
  }

  private parseInitializationArguments() {
    // Parse command line arguments for collection configuration
    const args = process.argv.slice(2);
    const collections: string[] = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--collection' && i + 1 < args.length) {
        collections.push(args[i + 1]);
        i++;
      } else if (args[i] === '--collections' && i + 1 < args.length) {
        // Parse comma-separated collections
        const collectionList = args[i + 1].split(',').map((c) => c.trim());
        collections.push(...collectionList);
        i++;
      }
    }

    if (collections.length > 0) {
      this.clientCollectionConfig = { collections };
      this.logger.log(
        `Client initialized with collections: ${collections.join(', ')}`,
      );
    } else {
      this.logger.warn(
        'No collection configuration provided via initialization arguments',
      );
    }
  }

  private registerToolHandlers() {
    if (!this.server) return;

    // Register list_tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // Register call_tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_code_semantic':
            return await this.handleSemanticSearch(args);
          case 'search_code_fulltext':
            return await this.handleFulltextSearch(args);
          case 'search_code_by_payload':
            return await this.handlePayloadSearch(args);
          default:
            throw new BadRequestException(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return this.formatError(error);
      }
    });
  }

  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_code_semantic',
        description:
          'Perform semantic search using vector embeddings to find relevant code snippets based on natural language queries',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            prompt: {
              type: 'string',
              description:
                'Optional context to refine the search query (enables query expansion)',
            },
            top_k: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_code_fulltext',
        description:
          'Perform full-text search for exact or partial text matches in code content',
        inputSchema: {
          type: 'object',
          properties: {
            textQuery: {
              type: 'string',
              description: 'Text to search for in code content',
            },
            payload: {
              type: 'object',
              description:
                'Optional filters to narrow results (e.g., {"language": "typescript"})',
            },
            top_k: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['textQuery'],
        },
      },
      {
        name: 'search_code_by_payload',
        description:
          'Search code by metadata filters only (e.g., file path, language, repository)',
        inputSchema: {
          type: 'object',
          properties: {
            payload: {
              type: 'object',
              description:
                'Metadata filters to match (e.g., {"filePath": "/src/search/*"})',
            },
            top_k: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['payload'],
        },
      },
    ];
  }

  private async handleSemanticSearch(
    args: Record<string, unknown> | undefined,
  ) {
    // Validate collection configuration
    if (!this.clientCollectionConfig) {
      throw new InternalServerErrorException(
        'Collection must be specified during client initialization using --collection or --collections argument',
      );
    }

    if (!args) {
      throw new BadRequestException('Arguments are required');
    }

    // Validate required parameters
    if (!args.query || typeof args.query !== 'string') {
      throw new BadRequestException(
        'query parameter is required and must be a string',
      );
    }

    const query = args.query as string;
    const prompt = args.prompt as string | undefined;
    const topK = (args.top_k as number) || 10;

    // Use client's configured collections
    const collectionName =
      this.clientCollectionConfig.collections.length === 1
        ? this.clientCollectionConfig.collections[0]
        : this.clientCollectionConfig.collections;

    const results = await this.searchService.search(
      query,
      collectionName,
      prompt,
      topK,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleFulltextSearch(
    args: Record<string, unknown> | undefined,
  ) {
    // Validate collection configuration
    if (!this.clientCollectionConfig) {
      throw new InternalServerErrorException(
        'Collection must be specified during client initialization using --collection or --collections argument',
      );
    }

    if (!args) {
      throw new BadRequestException('Arguments are required');
    }

    // Validate required parameters
    if (!args.textQuery || typeof args.textQuery !== 'string') {
      throw new BadRequestException(
        'textQuery parameter is required and must be a string',
      );
    }

    const textQuery = args.textQuery as string;
    const payload = args.payload as Record<string, unknown> | undefined;
    const topK = (args.top_k as number) || 10;

    // Use client's configured collections
    const collectionName =
      this.clientCollectionConfig.collections.length === 1
        ? this.clientCollectionConfig.collections[0]
        : this.clientCollectionConfig.collections;

    const results = await this.searchService.fulltextSearch(
      textQuery,
      collectionName,
      payload,
      topK,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handlePayloadSearch(args: Record<string, unknown> | undefined) {
    // Validate collection configuration
    if (!this.clientCollectionConfig) {
      throw new InternalServerErrorException(
        'Collection must be specified during client initialization using --collection or --collections argument',
      );
    }

    if (!args) {
      throw new BadRequestException('Arguments are required');
    }

    // Validate required parameters
    if (!args.payload || typeof args.payload !== 'object') {
      throw new BadRequestException(
        'payload parameter is required and must be an object',
      );
    }

    const payload = args.payload as Record<string, unknown>;
    const topK = (args.top_k as number) || 10;

    // Use client's configured collections
    const collectionName =
      this.clientCollectionConfig.collections.length === 1
        ? this.clientCollectionConfig.collections[0]
        : this.clientCollectionConfig.collections;

    const results = await this.searchService.searchByPayload(
      payload,
      collectionName,
      topK,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private formatError(error: unknown) {
    this.logger.error('MCP tool execution error', error);

    let code = -32603; // Internal error
    let message = 'Internal server error';

    if (error instanceof BadRequestException) {
      code = -32602; // Invalid params
      message = error.message;
    } else if (error instanceof NotFoundException) {
      code = -32001; // Resource not found
      message = error.message;
    } else if (error instanceof InternalServerErrorException) {
      code = -32603; // Internal error
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: {
                code,
                message,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
