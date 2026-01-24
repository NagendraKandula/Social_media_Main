import { Module } from '@nestjs/common';
import { PostingService } from './posting.service';
import { PostingController } from './posting.controller';
import { PostingProcessor } from './posting.processor';
import { StorageService } from '../storage/storage.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { FacebookModule } from '../social_media_platforms/facebook/facebook.module';
import { LinkedinModule } from '../social_media_platforms/linkedin/linkedin.module';
import { TwitterModule } from '../social_media_platforms/twitter/twitter.module';
import { YoutubeModule } from '../social_media_platforms/youtube/youtube.module';
import { ThreadsModule } from '../social_media_platforms/threads/threads.module';
import { InstagramBusinessModule } from '../social_media_platforms/instagram-business/instagram-business.module';
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'social-posting',
    }),
    FacebookModule,
    InstagramBusinessModule,
    LinkedinModule,
    TwitterModule,
    YoutubeModule,
    ThreadsModule
  ],
  controllers: [PostingController],
  providers: [
    PostingService, 
    PostingProcessor, 
    StorageService, 
    SchedulerService
  ],
  exports: [PostingService],
})
export class PostingModule {}