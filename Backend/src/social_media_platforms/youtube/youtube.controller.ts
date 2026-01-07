// Backend/src/youtube/youtube.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { YoutubeService } from './youtube.service';
import { Request } from 'express';

@Controller('youtube')
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService) {}

  @Post('upload-video')
  @UseGuards(JwtAuthGuard)
   async postVideo(
    @Req() req: any,
    @Body()body:
    {
      title: string;
      description: string;
      mediaType: 'VIDEO' | 'SHORTS';
      mediaUrl: string;

    },
   )
   {
    const userId = req.user.id;

    return this.youtubeService.uploadVideoToYoutube(
      userId,
      body.title,
      body.description,
      body.mediaType,
      body.mediaUrl,
    );
  }
}
