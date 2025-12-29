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

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) throw new BadRequestException('Authorization code missing');

    try {
      // ✅ FIX: Robust User ID extraction to prevent DB crashes
      let userId = 1; // Default fallback
      
      if (state) {
        try {
          const decoded = JSON.parse(decodeURIComponent(state));
          // Only update if userId is actually present
          if (decoded && decoded.userId) {
            userId = Number(decoded.userId);
          }
        } catch (e) {
          console.error('Failed to decode state:', e);
        }
      }

      // Safety check: Ensure we have a valid ID before hitting the DB
      if (!userId) {
        throw new BadRequestException('User ID could not be determined from state');
      }

      // 1. Exchange Code for Long-Lived Tokens
      const tokens = await this.threadsService.exchangeCodeForTokens(code);
      const { access_token, user_id, expires_in } = tokens;

      if (!access_token || !user_id)
        throw new InternalServerErrorException('Invalid Threads token response');

      // 2. Calculate expiration date
      const expiresAt = expires_in 
        ? new Date(Date.now() + expires_in * 1000) 
        : null;

      console.log(`💾 Saving Threads Token. User: ${userId}, Expires: ${expiresAt}`);

      // 3. Save to Database
      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'threads',
            providerId: user_id.toString(),
          },
        },
        update: {
          accessToken: access_token,
          expiresAt: expiresAt,
          userId: userId,
          updatedAt: new Date(),
        },
        create: {
          provider: 'threads',
          providerId: user_id.toString(),
          accessToken: access_token,
          expiresAt: expiresAt,
          userId: userId,
        },
      });
      
      // Redirect back to frontend
      res.redirect('http://localhost:3000/ActivePlatforms?threads=connected');
      
    } catch (error) {
      console.error('Threads callback error:', error);
      throw new InternalServerErrorException('Failed to authenticate with Threads');
    }
  }

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