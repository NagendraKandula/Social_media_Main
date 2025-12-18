import { Controller, Get, UseGuards, Req, Query,BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { YoutubeAnalyticsService } from './youtube-analytics.service';


@Controller('youtube-analytics')
export class YoutubeAnalyticsController {
  constructor(private readonly analyticsService: YoutubeAnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAnalytics(@Req() req,
  @Query('range') range: string,
  @Query('year') year?: number,
  @Query('month') month?: number,
) {
    // req.user contains the payload from the JWT, including the user's ID
    const userId = req.user.userId;
    return this.analyticsService.getChannelAnalytics(userId,range,year,month);
  }

// Add this new method to your YoutubeController class
}