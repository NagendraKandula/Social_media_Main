import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module'; // ✅ Import CloudinaryModule

@Module({
  imports: [HttpModule, ConfigModule, CloudinaryModule], // ✅ Add to imports
  controllers: [ThreadsController],
  providers: [ThreadsService, PrismaService],
})
export class ThreadsModule {}
