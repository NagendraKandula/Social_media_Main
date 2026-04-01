// Backend/src/Analytics/instagram-analytics/instagram-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class InstagramAnalyticsService {
  constructor(private readonly httpService: HttpService) {}

  async getMediaInsights(accessToken: string, mediaId: string) {
    if (!accessToken || !mediaId) {
      throw new Error('Missing accessToken or mediaId');
    }

    // Using your requested endpoint and metrics
    const url = `https://graph.instagram.com/${mediaId}/insights`;
    const params = {
      metric: 'shares,likes,saved,reach,comments',
      access_token: accessToken,
    };

    try {
      const response = await this.httpService.axiosRef.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram media insights');
    }
  }
}