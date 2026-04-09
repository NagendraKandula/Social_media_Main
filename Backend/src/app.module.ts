import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core Modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
//import { StorageModule } from './storage/storage.module';//
import { PostingModule } from './posting/posting.module';
//import { AiAssistantModule } from './ai-assistant/ai-assistant.module';

// Platform Auth & Posting Modules
import { YoutubeModule } from './social_media_platforms/youtube/youtube.module';
import { FacebookModule } from './social_media_platforms/facebook/facebook.module';
//import { YoutubeAnalyticsModule } from './youtube-analytics/youtube-analytics.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { InstagramModule } from './social_media_platforms/instagram/instagram.module';
import { TwitterModule } from './social_media_platforms/twitter/twitter.module';
import { ThreadsModule } from './social_media_platforms/threads/threads.module';
import { InstagramBusinessModule } from './social_media_platforms/instagram-business/instagram-business.module';
import { LinkedinModule } from './social_media_platforms/linkedin/linkedin.module';

// Analytics Modules
//import { YoutubeAnalyticsModule } from './youtube-analytics/youtube-analytics.module';
import { InstagramAnalyticsViaFbModule} from './analytics/instagram-analytics-via-fb/instagram-analytics-via-fb.module';
import { FacebookAnalyticsModule } from './analytics/facebook-analytics/facebook-analytics.module'; // New Module

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Core
    PrismaModule,
    AuthModule,
    PostingModule,
    AiAssistantModule,

    // Platforms
    YoutubeModule,
    FacebookModule,
     AiAssistantModule,
    InstagramModule,TwitterModule,ThreadsModule,InstagramBusinessModule,LinkedinModule,PostingModule, 
    InstagramAnalyticsViaFbModule,
    FacebookAnalyticsModule, // Registered here
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}