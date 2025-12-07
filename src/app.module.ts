import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { GitlabModule } from './gitlab/gitlab.module';
import { ChunkingModule } from './chunking/chunking.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { SearchModule } from './search/search.module';
import { IndexerModule } from './indexer/indexer.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    GitlabModule,
    ChunkingModule,
    EmbeddingModule,
    VectorStoreModule,
    SearchModule,
    IndexerModule,
    // Conditionally load MCP module when enabled
    ...(process.env.MCP_ENABLED === 'true' ? [McpModule.forRoot()] : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
