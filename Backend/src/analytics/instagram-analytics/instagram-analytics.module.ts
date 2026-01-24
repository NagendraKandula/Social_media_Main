// Backend/src/analytics/instagram-analytics/instagram-analytics.module.ts
import { Module } from '@nestjs/common';
import { InstagramAnalyticsController } from './instagram-analytics.controller';
import { InstagramAnalyticsService } from './instagram-analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InstagramAnalyticsController],
  providers: [InstagramAnalyticsService],
})
export class InstagramAnalyticsModule {}