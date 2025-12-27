// Backend/src/Analytics/instagram-analytics/instagram-analytics.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Required for API calls to Instagram
import { InstagramAnalyticsController } from './instagram-analytics.controller';
import { InstagramAnalyticsService } from './instagram-analytics.service';

@Module({
  imports: [
    // Register  HttpModule to enable the use of HttpService in your Service class
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [InstagramAnalyticsController],
  providers: [InstagramAnalyticsService],
  exports: [InstagramAnalyticsService], // Export if other modules need these analytics
})
export class InstagramAnalyticsModule {}