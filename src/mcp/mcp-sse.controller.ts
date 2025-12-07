import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
  Param,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpSseController {
  private readonly logger = new Logger(McpSseController.name);

  constructor(private readonly mcpService: McpService) {}

  /**
   * Establish SSE connection
   * GET /mcp/sse
   */
  @Get('sse')
  async handleSseConnection(@Req() req: Request, @Res() res: Response) {
    try {
      const sessionId = this.generateSessionId();
      this.logger.log(`New SSE connection request: ${sessionId}`);

      // Register the SSE session and create transport
      const transport = await this.mcpService.registerSseSession(sessionId, res);

      // Clean up on disconnect
      req.on('close', async () => {
        this.logger.log(`SSE connection closed: ${sessionId}`);
        await this.mcpService.unregisterSseSession(sessionId);
      });

      // The transport.start() method handles the response
      // so we don't need to send anything here
    } catch (error) {
      this.logger.error('Error establishing SSE connection', error);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  }

  /**
   * Handle incoming messages from client
   * POST /mcp/message/:sessionId
   */
  @Post('message/:sessionId')
  async handleMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!sessionId) {
        throw new BadRequestException('sessionId is required');
      }

      // Validate session exists
      const transport = this.mcpService.getSseTransport(sessionId);
      if (!transport) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'Session not found',
        });
      }

      // Process the message through MCP service
      await this.mcpService.handleSsePostMessage(sessionId, req, res, body);

      // The transport.handlePostMessage handles the response
      // so we don't need to send anything here if response not sent
      if (!res.headersSent) {
        return res.status(HttpStatus.OK).json({
          success: true,
        });
      }
    } catch (error) {
      this.logger.error('Error handling SSE message', error);
      if (!res.headersSent) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  }

  private generateSessionId(): string {
    return `sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}