// Backend/src/analytics/instagram-analytics/instagram-analytics.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InstagramAnalyticsViaFbService } from './instagram-analytics-via-fb.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('instagram-analytics-via-fb')
@UseGuards(JwtAuthGuard)
export class InstagramAnalyticsViaFbController {
  constructor(private readonly igService: InstagramAnalyticsViaFbService) {}

  @Get('account')
  getAccountStats(@Request() req) {
    return this.igService.getAccountAnalytics(req.user.userId);
  }

  @Get('posts-summary')
  getPostsSummary(@Request() req) {
    return this.igService.getPostLevelTotals(req.user.userId);
  }
}