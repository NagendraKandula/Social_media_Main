import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module'; 

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule],
  controllers: [InstagramController],
  providers: [InstagramService],
})
export class InstagramModule {}