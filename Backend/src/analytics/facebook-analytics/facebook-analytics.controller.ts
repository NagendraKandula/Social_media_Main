import { Controller, Get, Query, UseGuards, Req,Param } from '@nestjs/common';
import { FacebookAnalyticsService } from './facebook-analytics.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('facebook-analytics')
@UseGuards(JwtAuthGuard)
export class FacebookAnalyticsController {
  constructor(private readonly fbAnalytics: FacebookAnalyticsService) {}

 @Get('/details/:pageId')
async getDetails(@Req() req, @Param('pageId') pageId: string) {
  return this.fbAnalytics.getCompletePageAnalytics(req.user.id, pageId);
}
}