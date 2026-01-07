import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { YoutubeAnalyticsService } from './youtube-analytics.service';

@Controller('youtube-analytics')
export class YoutubeAnalyticsController {
  constructor(private readonly analyticsService: YoutubeAnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAnalytics(
    @Req() req,
    @Query('range') range: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    const userId = req.user.userId;
    // Calling the method defined in youtube-analytics.service.ts
    return this.analyticsService.getChannelAnalytics(userId, range, year, month);
  }
}