// Backend/src/analytics/instagram-analytics/instagram-analytics.module.ts
import { Module } from '@nestjs/common';
import { InstagramAnalyticsViaFbController } from './instagram-analytics-via-fb.controller';
import { InstagramAnalyticsViaFbService } from './instagram-analytics-via-fb.service';
import { PrismaModule } from '../../prisma/prisma.module'; // Adjust path if needed

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule , ConfigModule],
  controllers: [InstagramAnalyticsViaFbController],
  providers: [InstagramAnalyticsViaFbService],
})
export class InstagramAnalyticsViaFbModule {}