// Backend/src/facebook/facebook.module.ts
import { Module } from '@nestjs/common';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FacebookAuthService } from './facebook-auth.service';
import { FacebookMediaService } from './facebook-media.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [FacebookController],
  providers: [FacebookService, FacebookAuthService, FacebookMediaService],
  exports: [FacebookService,FacebookAuthService,FacebookMediaService],
})
export class FacebookModule {}