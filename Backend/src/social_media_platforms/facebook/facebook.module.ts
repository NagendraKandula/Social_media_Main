// Backend/src/facebook/facebook.module.ts
import { Module } from '@nestjs/common';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}