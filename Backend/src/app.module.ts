import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { YoutubeModule } from './auth/youtube/youtube.module';
import { FacebookModule } from './facebook/facebook.module';
import { YoutubeAnalyticsModule } from './youtube-analytics/youtube-analytics.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { InstagramModule } from './instagram/instagram.module';
import { TwitterModule } from './auth/twitter/twitter.module';
import { ThreadsModule } from './auth/threads/threads.module';
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
    InstagramModule,TwitterModule,ThreadsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AppModule {}