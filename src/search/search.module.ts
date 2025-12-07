import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { SearchController } from './search.controller';

@Module({
    controllers: [SearchController],
    imports: [ConfigModule, EmbeddingModule, VectorStoreModule],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule { }