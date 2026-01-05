import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'; // ✅ Import JwtAuthGuard

// ✅ DTO matches the JSON body sent by frontend
class PostThreadsDto {
  content: string;
  mediaUrl?: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly prisma: PrismaService,
    // ❌ CloudinaryService removed (handled by frontend/service now)
  ) {}

 

  // ✅ UPDATED: Secure endpoint that accepts mediaUrl directly
  @UseGuards(JwtAuthGuard) // 🔒 Protects route and populates req.user
  @Post('post')
  async postToThreads(
    @Body() body: PostThreadsDto,
    @Req() req: any, 
  ) {
    const { content, mediaUrl } = body;
    const userId = req.user?.id; // ✅ Taken securely from JWT

    if (!userId) {
        throw new UnauthorizedException('User not authenticated');
    }

    if (!content && !mediaUrl) {
      throw new BadRequestException('Content or media URL required');
    }

    // 1. Get the connected account
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (!account || !account.accessToken)
      throw new UnauthorizedException('User not connected to Threads');

    // 2. Post using the service
    return this.threadsService.postToThreads(account.accessToken, content, mediaUrl);
  }
}