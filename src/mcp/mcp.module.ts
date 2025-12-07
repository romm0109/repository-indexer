import { DynamicModule, Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { McpService } from './mcp.service';

@Module({})
export class McpModule {
  static forRoot(): DynamicModule {
    return {
      module: McpModule,
      imports: [SearchModule],
      providers: [McpService],
      exports: [McpService],
    };
  }
}
