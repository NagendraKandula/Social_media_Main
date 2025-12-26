
// src/twitter/twitter.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
@Module({
  imports: [
    HttpModule,
    ConfigModule, 
    CloudinaryModule,// Ensure ConfigModule is imported
  ],
  controllers: [TwitterController],
  providers: [TwitterService],
})
export class TwitterModule {}