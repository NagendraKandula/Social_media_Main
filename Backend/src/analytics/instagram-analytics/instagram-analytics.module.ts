// Backend/src/analytics/instagram-analytics/instagram-analytics.module.ts
import { Module } from '@nestjs/common';
import { InstagramAnalyticsController } from './instagram-analytics.controller';
import { InstagramAnalyticsService } from './instagram-analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule , ConfigModule],
  controllers: [InstagramAnalyticsController],
  providers: [InstagramAnalyticsService],
})
export class InstagramAnalyticsModule {}