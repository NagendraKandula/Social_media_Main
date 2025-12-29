import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TwitterService } from './twitter.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express'; 
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('twitter')
export class TwitterController {
  constructor(
    private readonly twitterService: TwitterService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('authorize')
  authorize(@Res() res: Response) {
    try {
      const { url, state, codeVerifier } = this.twitterService.generateAuthUrl();

      res.cookie('twitter_oauth_state', state, {
        httpOnly: true,
        secure: true,
        maxAge: 300000,
      });
      res.cookie('twitter_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: true,
        maxAge: 300000,
      });

      res.redirect(url);
    } catch {
      throw new InternalServerErrorException('Failed to generate auth URL');
    }
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error) throw new BadRequestException(`Twitter auth failed: ${error}`);
    if (!code || !state)
      throw new BadRequestException('Invalid callback: code/state missing');

    const storedCodeVerifier = req.cookies['twitter_code_verifier'];
    if (!storedCodeVerifier) throw new BadRequestException('Missing code verifier cookie');

    try {
      // 1. Extract User ID from state
      let userId = 1; 
      try {
        const decoded = JSON.parse(decodeURIComponent(state));
        userId = decoded.userId || 1;
      } catch (e) {
        console.warn('Could not decode state, defaulting user ID');
      }

      // 2. Exchange Code for Tokens
      const tokens = await this.twitterService.exchangeCodeForTokens(
        code,
        state,
        state,
        storedCodeVerifier,
      );

      // 3. ✅ FETCH REAL TWITTER ID (The Fix)
      // This is the vital step. We ask Twitter for the real ID (e.g. "12345").
      // Since "12345" is constant for the account, the DB will find the EXISTING row
      // and update it, instead of creating a new row for User 2.
      const twitterUser = await this.twitterService.getTwitterUser(tokens.access_token);
      const realProviderId = twitterUser.id;

      console.log(`✅ Twitter Connected. App User: ${userId}, Twitter ID: ${realProviderId}`);

      // 4. Save/Update in Database
      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'twitter',
            providerId: realProviderId, // ✅ Using Real ID
          },
        },
        update: {
          userId: userId, // ✅ Account ownership transfers to the new user
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
          updatedAt: new Date(),
        },
        create: {
          provider: 'twitter',
          providerId: realProviderId, // ✅ Using Real ID
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        },
      });

      res.clearCookie('twitter_code_verifier');
      
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/ActivePlatforms?twitter=connected`);

    } catch (error) {
      console.error("Callback Error:", error);
      res.clearCookie('twitter_code_verifier');
      
      // Handle the Rate Limit Gracefully
      if (error.message && error.message.includes('Rate Limit')) {
         const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
         return res.redirect(`${frontendUrl}/ActivePlatforms?error=twitter_rate_limit`);
      }

      throw new InternalServerErrorException('Failed to connect Twitter');
    }
  }

  @Post('post-media')
  @UseInterceptors(FileInterceptor('file'))
  async postMedia(
    @Body() body: { text: string; userId?: string },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any, 
  ) {
    if (!body.text) throw new BadRequestException('Tweet text is required');

    const userId = req.user?.id || parseInt(body.userId || '1'); 

    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'twitter' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('Twitter account not connected');
    }

    return this.twitterService.postTweetWithUserToken(
      body.text,
      file,
      account.accessToken,
    );
  }
}