// Backend/src/analytics/instagram-analytics/instagram-analytics.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InstagramAnalyticsViaFbService {
  private readonly graphApiUrl: string;
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    // Standardizes the base URL by stripping any trailing slashes just in case
    const baseUrl = this.configService.get<string>('FB_GRAPH_API_URL') || 'https://graph.facebook.com/v18.0';
    this.graphApiUrl = baseUrl.replace(/\/$/, '');
  }

  private async getSocialAccount(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'facebook' }, // Instagram Business uses Facebook tokens
    });
    if (!account) throw new BadRequestException('Instagram/Facebook account not connected.');
    return account;
  }

  private async getInstagramBusinessId(accessToken: string): Promise<string> {
    const url = `${this.graphApiUrl}/me/accounts?fields=instagram_business_account&access_token=${accessToken}`;
    const response = await axios.get(url);
    
    // Find the first page that actually has an Instagram account linked
    const linkedPage = response.data.data?.find((page: any) => page.instagram_business_account?.id);
    const igId = linkedPage?.instagram_business_account?.id;
    
    if (!igId) throw new BadRequestException('No Instagram Business Account linked to any Facebook page.');
    return igId;
  }

  async getAccountAnalytics(userId: number) {
    const { accessToken } = await this.getSocialAccount(userId);
    const igId = await this.getInstagramBusinessId(accessToken);

    // Profile Info (Your logic here is correct and will fetch name/picture)
    const profileUrl = `${this.graphApiUrl}/${igId}?fields=id,name,username,followers_count,media_count,profile_picture_url&access_token=${accessToken}`;
    
    // FIX: Added the missing "/" between graphApiUrl and igId
    const insightsUrl = `${this.graphApiUrl}/${igId}/insights?metric=reach,accounts_engaged,total_interactions,views&period=day&metric_type=total_value&access_token=${accessToken}`;

    try {
      const [profile, insights] = await Promise.all([
        axios.get(profileUrl),
        axios.get(insightsUrl),
      ]);

      return {
        profile: profile.data,
        metrics: insights.data.data,
      };
    } catch (error: any) {
      console.error("Graph API Error:", error.response?.data?.error || error.message);
      
      // If insights fail (sometimes due to unsupported metrics), fallback to just returning the profile
      if (error.response?.data?.error?.code === 100) {
          const profileFallback = await axios.get(profileUrl);
          return {
             profile: profileFallback.data,
             metrics: []
          };
      }
      throw new InternalServerErrorException('Failed to fetch Instagram data from Facebook Graph API.');
    }
  }

  async getPostLevelTotals(userId: number) {
    const { accessToken } = await this.getSocialAccount(userId);
    const igId = await this.getInstagramBusinessId(accessToken);

    try {
      // Fetch media with individual insights
      // Note: 'video_views' might throw an error if a post is an image. If it does, remove it from the metric list.
      const url = `${this.graphApiUrl}/${igId}?fields=media{id,like_count,comments_count,insights.metric(impressions,reach,saved)}&access_token=${accessToken}`;
      const response = await axios.get(url);
      const mediaList = response.data.media?.data || [];

      // Aggregate totals from all posts
      const totals = {
        totalLikes: 0,
        totalComments: 0,
        totalImpressions: 0,
        totalReach: 0,
        totalSaved: 0,
      };

      mediaList.forEach((post: any) => {
        totals.totalLikes += post.like_count || 0;
        totals.totalComments += post.comments_count || 0;
        
        post.insights?.data?.forEach((ins: any) => {
          if (ins.name === 'impressions') totals.totalImpressions += ins.values[0].value;
          if (ins.name === 'reach') totals.totalReach += ins.values[0].value;
          if (ins.name === 'saved') totals.totalSaved += ins.values[0].value;
        });
      });

      return totals;
    } catch (error: any) {
      console.error("Media Insights Error:", error.response?.data?.error || error.message);
      throw new InternalServerErrorException('Failed to fetch media insights.');
    }
  }
}