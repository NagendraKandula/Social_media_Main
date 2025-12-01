import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { YoutubeModule } from './social_media_platforms/youtube/youtube.module';
import { FacebookModule } from './social_media_platforms/facebook/facebook.module';
import { YoutubeAnalyticsModule } from './youtube-analytics/youtube-analytics.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { InstagramModule } from './social_media_platforms/instagram/instagram.module';
import { TwitterModule } from './social_media_platforms/twitter/twitter.module';
import { ThreadsModule } from './social_media_platforms/threads/threads.module';
import { InstagramBusinessModule } from './social_media_platforms/instagram-business/instagram-business.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigModule available globally
    }),
    PrismaModule,
    AuthModule,
    YoutubeModule,
    FacebookModule,
    YoutubeAnalyticsModule,
     AiAssistantModule,
    InstagramModule,TwitterModule,ThreadsModule,InstagramBusinessModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AppModule {}