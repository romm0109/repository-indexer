import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { SearchController } from './search.controller';
import { RerankerModule } from '../reranker/reranker.module';

@Module({
    controllers: [SearchController],
    imports: [ConfigModule, EmbeddingModule, VectorStoreModule, RerankerModule],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule { }