import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LinkedinService } from './linkedin.service';
import { LinkedinController } from './linkedin.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, PrismaModule, ConfigModule],
  controllers: [LinkedinController],
  providers: [LinkedinService],
  exports: [LinkedinService],
})
export class LinkedinModule {}