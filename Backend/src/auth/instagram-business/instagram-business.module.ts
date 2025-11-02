import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstagramBusinessController } from './instagram-business.controller';
import { InstagramBusinessService } from './instagram-business.service';
import { PrismaService } from 'src/prisma/prisma.service'; // 👈 add this

@Module({
  imports: [HttpModule],
  controllers: [InstagramBusinessController],
  providers: [InstagramBusinessService, PrismaService], // 👈 include PrismaService
})
export class InstagramBusinessModule {}
