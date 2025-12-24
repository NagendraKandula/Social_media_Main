import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

@Injectable()
export class InstagramAnalyticsService {
  constructor(private readonly httpService: HttpService) {}

  async getInstagramInsights(accessToken: string, userId: string) {
    if (!accessToken || !userId) {
      throw new Error('Missing accessToken or userId');
    }

    const url = `https://graph.facebook.com/v18.0/${userId}/insights?access_token=${accessToken}`;

    try {
      const response: AxiosResponse<any> =
        await this.httpService.axiosRef.get(url);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch Instagram analytics');
    }
  }
}
