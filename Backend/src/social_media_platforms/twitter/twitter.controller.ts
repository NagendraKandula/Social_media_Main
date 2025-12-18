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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TwitterService } from './twitter.service';
import { Request, Response } from 'express'; // ✅ Make sure Request is imported

@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

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

    const storedState = req.cookies['twitter_oauth_state'];
    const storedCodeVerifier = req.cookies['twitter_code_verifier'];

    try {
      const tokens = await this.twitterService.exchangeCodeForTokens(
        code,
        state,
        storedState,
        storedCodeVerifier,
      );

      console.log('✅ Granted scopes:', tokens.scope);

      res.cookie('twitter_access_token', tokens.access_token, {
        httpOnly: true,
        secure: true,
        maxAge: tokens.expires_in * 1000,
      });
      res.cookie('twitter_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.clearCookie('twitter_oauth_state');
      res.clearCookie('twitter_code_verifier');

      res.redirect('http://localhost:3000/TwitterPost');
    } catch (error) {
      res.clearCookie('twitter_oauth_state');
      res.clearCookie('twitter_code_verifier');
      throw error;
    }
  }

  /**
   * ✅ UPDATED: This now reads the user's token from the cookie
   */
  @Post('post-media')
  @UseInterceptors(FileInterceptor('file'))
  async postMedia(
    @Body() body: { text: string },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request, // ✅ Add Request object
  ) {
    if (!body.text) throw new BadRequestException('Tweet text is required');

    // ✅ Get the token the user received when they logged in
    const userAccessToken = req.cookies['twitter_access_token'];

    if (!userAccessToken) {
      throw new BadRequestException(
        'User not authenticated. Please reconnect your Twitter account.',
      );
    }

    // ✅ Pass the user's token to the service
    return this.twitterService.postTweetWithUserToken(
      body.text,
      file,
      userAccessToken,
    );
  }
}
