import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [ThreadsController],
  providers: [ThreadsService, PrismaService],
})
export class ThreadsModule {}
