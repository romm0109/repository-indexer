import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerService } from './indexer.service';
import { IndexerController } from './indexer.controller';
import { GitlabModule } from '../gitlab/gitlab.module';
import { ChunkingModule } from '../chunking/chunking.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [
    ConfigModule,
    GitlabModule,
    ChunkingModule,
    EmbeddingModule,
    VectorStoreModule,
  ],
  providers: [IndexerService],
  controllers: [IndexerController],
})
export class IndexerModule {}