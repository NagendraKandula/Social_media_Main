import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstagramBusinessService } from './instagram-business.service';
import { InstagramBusinessController } from './instagram-business.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,   // 👈 Required for external API calls to Instagram
    PrismaModule,
    ConfigModule // 👈 Required to fetch Access Tokens from DB
  ],
  controllers: [InstagramBusinessController],
  providers: [InstagramBusinessService],
  exports: [InstagramBusinessService],
})
export class InstagramBusinessModule {}
