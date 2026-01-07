
// src/twitter/twitter.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { PrismaModule } from '../../prisma/prisma.module';
@Module({
  imports: [
    HttpModule,
    ConfigModule, 
    CloudinaryModule,
    PrismaModule,// Ensure ConfigModule is imported
  ],
  controllers: [TwitterController],
  providers: [TwitterService],
  exports: [TwitterService],
})
export class TwitterModule {}