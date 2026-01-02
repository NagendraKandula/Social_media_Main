import { Controller, Get, Post, Body, Query, Req, Res, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { LinkedinService } from './linkedin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('linkedin')
export class LinkedinController {
  constructor(
    private readonly linkedinService: LinkedinService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // 1. Authorize (Start Login)
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  authorize(@Req() req: any, @Res() res: Response) {
    const userId = req.user.id;
    const url = this.linkedinService.generateAuthUrl(userId);
    res.redirect(url);
  }

  // 2. Callback (Finish Login)
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (error) {
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=linkedin_denied`);
    }
    if (!code || !state) throw new BadRequestException('Invalid callback');

    try {
      const decodedState = JSON.parse(decodeURIComponent(state));
      const userId = decodedState.userId;

      // Exchange Code
      const tokens = await this.linkedinService.exchangeCodeForToken(code);

      // Get Profile (We need the 'sub' ID)
      const profile = await this.linkedinService.getUserProfile(tokens.access_token);
      const linkedinId = profile.sub; // The unique ID for this user

      // Save to Database
      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'linkedin',
            providerId: linkedinId,
          },
        },
        update: {
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          updatedAt: new Date(),
        },
        create: {
          provider: 'linkedin',
          providerId: linkedinId,
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return res.redirect(`${frontendUrl}/ActivePlatforms?linkedin=connected`);

    } catch (error) {
      console.error('LinkedIn Callback Error:', error);
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=linkedin_failed`);
    }
  }

  // 3. Post Content Endpoint
  @Post('post')
  @UseGuards(JwtAuthGuard)
  async postContent(@Req() req: any, @Body() body: { text: string }) {
    const userId = req.user.id;
    const { text } = body;

    if (!text) throw new BadRequestException('Text is required');

    // Find the connected account
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'linkedin' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('LinkedIn account not connected');
    }

    // Call Service
    return this.linkedinService.postToLinkedIn(
      account.accessToken,
      account.providerId, 
      text
    );
  }
}