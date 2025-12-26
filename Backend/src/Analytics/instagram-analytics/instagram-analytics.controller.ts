// Backend/src/Analytics/instagram-analytics/instagram-analytics.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { InstagramAnalyticsService } from './instagram-analytics.service';

@Controller('analytics/instagram')
export class InstagramAnalyticsController {
  constructor(private readonly igService: InstagramAnalyticsService) {}

  @Get('media-insights')
  async getMediaAnalytics(
    @Query('accessToken') accessToken: string,
    @Query('mediaId') mediaId: string,
  ) {
    return this.igService.getMediaInsights(accessToken, mediaId);
  }
}