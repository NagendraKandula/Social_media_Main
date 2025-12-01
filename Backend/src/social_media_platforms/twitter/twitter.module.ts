
// src/twitter/twitter.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule, // Ensure ConfigModule is imported
  ],
  controllers: [TwitterController],
  providers: [TwitterService],
})
export class TwitterModule {}