import { Module } from '@nestjs/common';
import { FacebookAnalyticsService } from './facebook-analytics.service';
import { FacebookAnalyticsController } from './facebook-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FacebookModule } from '../../social_media_platforms/facebook/facebook.module';

@Module({
  imports: [
    PrismaModule,
    FacebookModule, // This provides FacebookAuthService
  ],
  controllers: [FacebookAnalyticsController],
  providers: [FacebookAnalyticsService],
  exports: [FacebookAnalyticsService],
})
export class FacebookAnalyticsModule {}