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
  UnauthorizedException,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { Request, Response } from 'express';

class PostThreadsDto {
  content: string;
  mediaUrl?: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  // 🚀 STEP 1 — Handle OAuth callback (frontend will redirect here)
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) throw new BadRequestException('Authorization code missing');

    try {
      // exchange code for access_token
      const tokens = await this.threadsService.exchangeCodeForTokens(code);
      console.log('Threads Tokens:', tokens);
      // save or set cookie
      res.cookie('threads_access_token', tokens.access_token, {
        httpOnly: true,
        secure: true, // set to true in production
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      // redirect back to your frontend dashboard or landing
      res.redirect('http://localhost:3000/Landing');
    } catch (error) {
      console.error('Threads callback error:', error);
      throw new InternalServerErrorException('Failed to authenticate with Threads');
    }
  }

  // 🚀 STEP 2 — Post to Threads using stored access_token
  @Post('post')
  async postToThreads(@Body() body: PostThreadsDto, @Req() req: Request) {
    const { content, mediaUrl } = body;
    if (!content && !mediaUrl)
      throw new BadRequestException('Content or media URL required');

    const accessToken = req.cookies['threads_access_token'];
    if (!accessToken)
      throw new UnauthorizedException('User not authenticated with Threads');

    return this.threadsService.postToThreads(accessToken, content, mediaUrl);
  }
}
