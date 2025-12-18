// Backend/src/youtube/youtube.controller.ts
import {
  Body,
  Controller,
  Post,
  Get, 
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { YoutubeService } from './youtube.service';
import { Request } from 'express';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('upload-video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('video'))
  uploadVideo(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description: string },
  ) {
    const accessToken = req.cookies['youtube_access_token'];
    const refreshToken = req.cookies['youtube_refresh_token'];
    if (!accessToken) {
      throw new BadRequestException('YouTube access token not found. Please connect your YouTube account.');
    }
    return this.youtubeService.uploadVideoToYoutube(
      accessToken,
      refreshToken,
      file,
      body.title,
      body.description,
    );
  }

  
}