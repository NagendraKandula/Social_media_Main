import { Controller, Get, Query } from '@nestjs/common';
import { InstagramAnalyticsService } from './instagram-analytics.service';

@Controller('analytics/instagram')
export class InstagramAnalyticsController {
  constructor(private readonly igService: InstagramAnalyticsService) {}

  @Get()
  async getInstagramAnalytics(
    @Query('accessToken') accessToken: string,
    @Query('userId') userId: string,
  ) {
    return this.igService.getInstagramInsights(accessToken, userId);
  }
}
