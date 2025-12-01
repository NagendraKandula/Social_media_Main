// Backend/src/youtube/youtube.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class YoutubeService {
  constructor(
    private config: ConfigService,
     private prisma: PrismaService,
    ) {}

  async uploadVideoToYoutube(
    accessToken: string,
    refreshToken: string,
    file: Express.Multer.File,
    title: string,
    description: string,
  ) {
    if (!file) {
      throw new BadRequestException('No video file uploaded.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('YOUTUBE_CLIENT_ID'),
      this.config.get<string>('YOUTUBE_CLIENT_SECRET'),
      this.config.get<string>('YOUTUBE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const readableFile = new Readable();
    readableFile.push(file.buffer);
    readableFile.push(null);

    try {
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus: 'public',
          },
        },
        media: {
          body: readableFile,
        },
      });

      return {
        message: 'Video uploaded successfully!',
        videoId: response.data.id,
      };
    } catch (error) {
      console.error('Error uploading video to YouTube:', error);
      throw new BadRequestException('Failed to upload video to YouTube.');
    }
  }


  
}