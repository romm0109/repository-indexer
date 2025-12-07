import { DynamicModule, Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { McpService } from './mcp.service';
import { McpSseController } from './mcp-sse.controller';

@Module({})
export class McpModule {
  static forRoot(): DynamicModule {
    return {
      module: McpModule,
      imports: [SearchModule],
      controllers: [McpSseController],
      providers: [McpService],
      exports: [McpService],
    };
  }
}
