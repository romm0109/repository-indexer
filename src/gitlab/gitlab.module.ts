import { Module } from '@nestjs/common';
import { GitlabService } from './gitlab.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GitlabService],
  exports: [GitlabService],
})
export class GitlabModule {}
