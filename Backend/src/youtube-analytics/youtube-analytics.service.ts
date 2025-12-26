import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class YoutubeAnalyticsService {
  constructor(private prisma: PrismaService, private configService: ConfigService) {}

  private async _refreshAccessToken(socialAccount): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('YOUTUBE_CLIENT_ID'),
      this.configService.get<string>('YOUTUBE_CLIENT_SECRET'),
      this.configService.get<string>('YOUTUBE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({
      refresh_token: socialAccount.refreshToken,
    });

    try {
      const { token } = await oauth2Client.getAccessToken();
      const newAccessToken = token;

      if (!newAccessToken) {
        throw new InternalServerErrorException('Failed to refresh YouTube access token: Token was null.');
      }

      // Update the social account with the new access token in your database
      await this.prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: { accessToken: newAccessToken },
      });

      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh YouTube access token:', error);
      throw new InternalServerErrorException('Failed to refresh YouTube access token.');
    }
  }

  async getChannelAnalytics(userId: number, range: string, year?: number, month?: number) {
    let socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        provider: 'youtube',
      },
    });

    if (!socialAccount) {
      throw new BadRequestException('YouTube account not connected for this user.');
    }

    let accessToken = socialAccount.accessToken;
    const analyticsApiUrl = 'https://youtubeanalytics.googleapis.com/v2/reports';

    let startDate: string;
    let endDate: string = new Date().toISOString().split('T')[0];
    switch (range) {
      case '7d':
        startDate = subDays(new Date(), 7).toISOString().split('T')[0];
        break;
      case '28d':
        startDate = subDays(new Date(), 28).toISOString().split('T')[0];
        break;
      case '90d':
        startDate = subDays(new Date(), 90).toISOString().split('T')[0];
        break;
      case '365d':
        startDate = subDays(new Date(), 365).toISOString().split('T')[0];
        break;
      case 'month':
        if (!year || !month) throw new Error('Year and month required for monthly analytics');
        const firstDay = startOfMonth(new Date(year, month - 1));
        const lastDay = endOfMonth(firstDay);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
        break;
      case 'lifetime':
        startDate = '2005-02-14';
        break;
      default:
        throw new Error('Invalid analytics range');
    }

    const makeRequest = async (token: string) => {
      return axios.get(analyticsApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ids: 'channel==MINE',
          startDate,
          endDate,
          metrics: 'views,likes,comments,subscribersGained',
          dimensions: 'day',
          sort: 'day',
        },
      });
    };

    try {
      if (!accessToken) {
        throw new InternalServerErrorException('Access Token is not available');
      }
      const response = await makeRequest(accessToken);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Token expired, let's refresh it.
        try {
          const newAccessToken = await this._refreshAccessToken(socialAccount);
          const response = await makeRequest(newAccessToken);
          return response.data;
        } catch (refreshError) {
          console.error('Error fetching YouTube analytics after refresh:', refreshError.response ? refreshError.response.data : refreshError.message);
          throw new InternalServerErrorException('Failed to fetch YouTube analytics even after refreshing the token.');
        }
      } else {
        console.error('Error fetching YouTube analytics:', error.response ? error.response.data : error.message);
        throw new InternalServerErrorException('Failed to fetch YouTube analytics');
      }
    }
  }
}