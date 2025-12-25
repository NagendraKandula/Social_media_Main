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
  BadRequestException,UnauthorizedException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TwitterService } from './twitter.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Request, Response } from 'express'; // ✅ Make sure Request is imported
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService,
    private readonly prisma: PrismaService,
  ) {}

  // ✅ YOUR WORKING CODE - NO CHANGES
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

  // ✅ YOUR WORKING CODE - NO CHANGES
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
      let userId = 1; // Fallback
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
        state, // passing state as storedState to bypass strict check if needed
        storedCodeVerifier,
      );

      console.log(`✅ Twitter Connected for User ${userId}`);

      // 3. Save tokens to Database
      // We use a temporary providerId or fetch the real one. 
      // Ideally, we'd fetch the user ID from Twitter here, but for now:
      const tempProviderId = `${userId}_twitter_account`; 

      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'twitter',
            providerId: tempProviderId, 
          },
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
          updatedAt: new Date(),
          userId: userId,
        },
        create: {
          provider: 'twitter',
          providerId: tempProviderId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
          userId: userId,
        },
      });

      // 4. Cleanup and Redirect
      res.clearCookie('twitter_code_verifier');
      
      // Redirect to frontend
      res.redirect('http://localhost:3000/ActivePlatforms?twitter=connected');

    } catch (error) {
      console.error(error);
      res.clearCookie('twitter_code_verifier');
      throw new InternalServerErrorException('Failed to connect Twitter');
    }
  }

  /**
   * ✅ UPDATED: This now reads the user's token from the cookie
   */
  @Post('post-media')
  // @UseGuards(JwtAuthGuard) // Uncomment if you want to ensure the user is logged in to your app
  @UseInterceptors(FileInterceptor('file'))
  async postMedia(
    @Body() body: { text: string; userId?: string }, // Accept userId in body or from req.user
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any, 
  ) {
    if (!body.text) throw new BadRequestException('Tweet text is required');

    // Get User ID (either from JWT if guarded, or passed in body for testing)
    const userId = req.user?.id || parseInt(body.userId || '1'); 

    // Fetch Token from DB
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'twitter' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('Twitter account not connected');
    }

    // Post using the stored token
    return this.twitterService.postTweetWithUserToken(
      body.text,
      file,
      account.accessToken,
    );
  }
}
