import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../../prisma/prisma.service';
 // ✅ Import CloudinaryModule

@Module({
  imports: [HttpModule, ConfigModule], // ✅ Add to imports
  controllers: [ThreadsController],
  providers: [ThreadsService, PrismaService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
