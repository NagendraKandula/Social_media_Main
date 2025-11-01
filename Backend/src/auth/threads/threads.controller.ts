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
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email?: string; name?: string };
}

class PostThreadsDto {
  content: string;
  mediaUrl?: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly prisma: PrismaService,
  ) {}

  // ✅ STEP 1: Handle OAuth callback
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!code) throw new BadRequestException('Authorization code missing');

    try {
      const tokens = await this.threadsService.exchangeCodeForTokens(code);
      const { access_token, user_id } = tokens;

      if (!access_token || !user_id)
        throw new InternalServerErrorException('Invalid Threads token response');

      const userId = req.user?.id || 1; // Replace with real user ID later

      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'threads',
            providerId: user_id.toString(),
          },
        },
        update: {
          accessToken: access_token,
          updatedAt: new Date(),
        },
        create: {
          provider: 'threads',
          providerId: user_id.toString(),
          accessToken: access_token,
          userId,
        },
      });

      console.log('✅ Threads access token saved for user:', userId);
      res.redirect('http://localhost:3000/Landing?threads=connected');
    } catch (error) {
      console.error('Threads callback error:', error);
      throw new InternalServerErrorException('Failed to authenticate with Threads');
    }
  }

  // ✅ STEP 2: Post to Threads
  @Post('post')
  async postToThreads(
    @Body() body: PostThreadsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { content, mediaUrl } = body;
    const userId = req.user?.id || 1;

    if (!content && !mediaUrl)
      throw new BadRequestException('Content or media URL required');

    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (!account || !account.accessToken)
      throw new UnauthorizedException('User not connected to Threads');

    return this.threadsService.postToThreads(account.accessToken, content, mediaUrl);
  }
}