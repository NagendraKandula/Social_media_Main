import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { InstagramAnalyticsController } from './instagram-analytics.controller';
import { InstagramAnalyticsService } from './instagram-analytics.service';

@Module({
  imports: [HttpModule],
  controllers: [InstagramAnalyticsController],
  providers: [InstagramAnalyticsService],
})
export class InstagramAnalyticsModule {}
