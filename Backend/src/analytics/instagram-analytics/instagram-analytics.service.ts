// Backend/src/analytics/instagram-analytics/instagram-analytics.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class InstagramAnalyticsService {
  constructor(private prisma: PrismaService) {}

  private async getSocialAccount(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'facebook' }, // Instagram Business uses Facebook tokens
    });
    if (!account) throw new BadRequestException('Instagram/Facebook account not connected.');
    return account;
  }

  private async getInstagramBusinessId(accessToken: string): Promise<string> {
    const url = `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`;
    const response = await axios.get(url);
    const igId = response.data.data?.[0]?.instagram_business_account?.id;
    if (!igId) throw new BadRequestException('No Instagram Business Account linked to this Facebook page.');
    return igId;
  }

  async getAccountAnalytics(userId: number) {
    const { accessToken } = await this.getSocialAccount(userId);
    const igId = await this.getInstagramBusinessId(accessToken);

    // Fetch Profile Info & Insights
    const profileUrl = `https://graph.facebook.com/v21.0/${igId}?fields=id,name,username,followers_count,media_count,profile_picture_url&access_token=${accessToken}`;
    const insightsUrl = `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,accounts_engaged,total_interactions,views&period=day&metric_type=total_value&access_token=${accessToken}`;

    const [profile, insights] = await Promise.all([
      axios.get(profileUrl),
      axios.get(insightsUrl),
    ]);

    return {
      profile: profile.data,
      metrics: insights.data.data,
    };
  }

  async getPostLevelTotals(userId: number) {
    const { accessToken } = await this.getSocialAccount(userId);
    const igId = await this.getInstagramBusinessId(accessToken);

    // Fetch media with individual insights
    const url = `https://graph.facebook.com/v21.0/${igId}?fields=media{id,like_count,comments_count,insights.metric(impressions,reach,saved,video_views)}&access_token=${accessToken}`;
    const response = await axios.get(url);
    const mediaList = response.data.media?.data || [];

    // Aggregate totals from all posts
    const totals = {
      totalLikes: 0,
      totalComments: 0,
      totalImpressions: 0,
      totalReach: 0,
      totalSaved: 0,
      totalVideoViews: 0,
    };

    mediaList.forEach((post) => {
      totals.totalLikes += post.like_count || 0;
      totals.totalComments += post.comments_count || 0;
      
      post.insights?.data?.forEach((ins) => {
        if (ins.name === 'impressions') totals.totalImpressions += ins.values[0].value;
        if (ins.name === 'reach') totals.totalReach += ins.values[0].value;
        if (ins.name === 'saved') totals.totalSaved += ins.values[0].value;
        if (ins.name === 'video_views') totals.totalVideoViews += ins.values[0].value;
      });
    });

    return totals;
  }
}