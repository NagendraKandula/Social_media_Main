// Backend/src/analytics/instagram-analytics/instagram-analytics.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InstagramAnalyticsService } from './instagram-analytics.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('instagram-analytics')
@UseGuards(JwtAuthGuard)
export class InstagramAnalyticsController {
  constructor(private readonly igService: InstagramAnalyticsService) {}

  @Get('account')
  getAccountStats(@Request() req) {
    return this.igService.getAccountAnalytics(req.user.userId);
  }

  @Get('posts-summary')
  getPostsSummary(@Request() req) {
    return this.igService.getPostLevelTotals(req.user.userId);
  }
}