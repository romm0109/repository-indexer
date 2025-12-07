import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ChunkingService],
  exports: [ChunkingService],
})
export class ChunkingModule {}