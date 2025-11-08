import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { Request, Response } from 'express';

class PostTweetDto {
  text: string;
  mediaUrls?: string[];
}

@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

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

  // ✅ POST /twitter/post-media — supports text + images/videos
  @Post('post-media')
  async postMedia(@Body() body: PostTweetDto) {
    const { text, mediaUrls } = body;
    if (!text) throw new BadRequestException('Tweet text is required');
    return this.twitterService.postTweetOAuth1(text, mediaUrls);
  }
}
