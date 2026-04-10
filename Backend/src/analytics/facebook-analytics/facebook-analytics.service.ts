import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookAuthService } from '../../social_media_platforms/facebook/facebook-auth.service';
import axios from 'axios';

@Injectable()
export class FacebookAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private fbAuth: FacebookAuthService,
  ) {}

  async getCompletePageAnalytics(userId: number, pageId: string) {
    const userAccessToken = await this.fbAuth.getFacebookToken(userId);
    const pageAccessToken = await this.fbAuth.getPageToken(userAccessToken, pageId);

    // 1. Basic Page Info & Growth
    const pageInfoUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,fan_count,followers_count,link,category,about,description&access_token=${pageAccessToken}`;
    
    // 2. Page Insights (Time Series)
    const pageInsightsUrl = `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_views_total,page_post_engagements,page_actions_post_reactions_total,page_video_views&period=day&access_token=${pageAccessToken}`;

    // 3. Post Level Data (Recent Posts)
    const postsUrl = `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=5&access_token=${pageAccessToken}`;

    // 4. Video List
    const videosUrl = `https://graph.facebook.com/v21.0/${pageId}/videos?fields=id,description,created_time,length&limit=5&access_token=${pageAccessToken}`;

    const [info, insights, posts, videos] = await Promise.all([
      axios.get(pageInfoUrl),
      axios.get(pageInsightsUrl),
      axios.get(postsUrl),
      axios.get(videosUrl),
    ]);

    return {
      profile: info.data,
      metrics: insights.data.data,
      recentPosts: posts.data.data,
      recentVideos: videos.data.data,
    };
  }

  // Helper for specific post insights when a user clicks a post
  async getPostDetailAnalytics(userId: number, pageId: string, postId: string) {
    const userAccessToken = await this.fbAuth.getFacebookToken(userId);
    const pageAccessToken = await this.fbAuth.getPageToken(userAccessToken, pageId);

    const metrics = 'post_impressions_unique,post_clicks,post_reactions_by_type_total';
    const url = `https://graph.facebook.com/v21.0/${postId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
    
    const res = await axios.get(url);
    return res.data.data;
  }
}