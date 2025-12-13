import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalRepoService } from './local-repo.service';

@Module({
  imports: [ConfigModule],
  providers: [LocalRepoService],
  exports: [LocalRepoService],
})
export class LocalRepoModule {}
