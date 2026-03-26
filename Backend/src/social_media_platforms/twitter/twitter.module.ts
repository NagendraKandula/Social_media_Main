
// src/twitter/twitter.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { StorageService } from '../../storage/storage.service';
@Module({
  imports: [
    HttpModule,
    ConfigModule, 
    
    PrismaModule,// Ensure ConfigModule is imported
  ],
  controllers: [TwitterController],
  providers: [TwitterService,StorageService],
  exports: [TwitterService],
})
export class TwitterModule {}