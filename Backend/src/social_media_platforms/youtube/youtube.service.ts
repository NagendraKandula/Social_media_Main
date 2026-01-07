// Backend/src/youtube/youtube.service.ts
import { Injectable, BadRequestException ,InternalServerErrorException} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class YoutubeService {
  constructor(
    private config: ConfigService,
     private prisma: PrismaService,
    ) {}

  async uploadVideoToYoutube(
   userId: number,
    title: string,
    description: string,
    mediaType: 'VIDEO' | 'SHORTS',
    mediaUrl: string,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'youtube' },
    });
    if (!account || !account.accessToken) {
      throw new BadRequestException('YouTube account not connected.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('YOUTUBE_CLIENT_ID'),
      this.config.get<string>('YOUTUBE_CLIENT_SECRET'),
      this.config.get<string>('YOUTUBE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });


    try {
      const responseStream = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
      });

      const finalDescription = mediaType === 'SHORTS' ? `${description}\n\n#shorts` : description;
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            categoryId: '22',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: responseStream.data,
        },
      });

      return {
        success: true,
        message: `${mediaType === 'SHORTS' ? 'Youtube Shorts' : 'Youtube Video'} uploaded successfully .`,
        videoId: response.data.id,
      };
    } catch (error) {
      console.error('Error uploading video to YouTube:', error);
      throw new BadRequestException('Failed to upload video to YouTube.');
    }
  }


  
}