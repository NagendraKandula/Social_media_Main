import { Module } from '@nestjs/common';
import { YoutubeAnalyticsController } from './youtube-analytics.controller';
import { YoutubeAnalyticsService } from './youtube-analytics.service';
import { PrismaModule } from '../prisma/prisma.module'; // Ensure this path matches your directory structure

@Module({
  imports: [PrismaModule],
  controllers: [YoutubeAnalyticsController],
  providers: [YoutubeAnalyticsService],
})
export class YoutubeAnalyticsModule {}