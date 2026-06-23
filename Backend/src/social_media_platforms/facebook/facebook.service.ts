import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FacebookAuthService } from './facebook-auth.service';
import { FacebookMediaService } from './facebook-media.service';

@Injectable()
export class FacebookService {
private readonly FACEBOOK_GRAPH_API_URL: string;

  // Inject ConfigService into your constructor
  constructor(
    private readonly facebookAuthService: FacebookAuthService,
    private readonly facebookMediaService: FacebookMediaService,
  ) {}
  async getPages(userId: number) {
    return this.facebookAuthService.getPages(userId);
  }

  /**
   * UPDATED: Main function, now takes pageId, mediaUrl, and mediaType
   */
  async postToFacebook(
    userId: number,
    pageId: string,
    content: string,
    mediaUrls: string | string[],
    mediaType: 'IMAGE' | 'VIDEO' | 'STORY'|'REEL',
    postType: 'feed' | 'reel' | 'story' = 'feed',
  ) {
    const userAccessToken = await this.facebookAuthService.getFacebookToken(userId);
    const pageAccessToken = await this.facebookAuthService.getPageToken(userAccessToken, pageId);
  

    try {
      // Step 3: Determine post type and call the appropriate function
      if (postType === 'feed') {
        const feedUrls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
        if (mediaType !== 'IMAGE') {
          throw new BadRequestException('Facebook Feed supports image posts only.');
        }

        if (feedUrls.length === 1) {
          return await this.facebookMediaService.postPhoto(pageId, pageAccessToken, content, feedUrls[0]);
        }

        return await this.facebookMediaService.postFeedPhotos(pageId, pageAccessToken, content, feedUrls);
      }

      if (postType === 'reel') {
        const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;
        if (mediaType !== 'VIDEO' && mediaType !== 'REEL') {
          throw new BadRequestException('Facebook Reel requires a video.');
        }

        return await this.facebookMediaService.postFacebookReel(pageId, pageAccessToken, content, singleUrl);
      }

      if (postType === 'story') {
        const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;

        if (mediaType === 'VIDEO' || mediaType === 'REEL' || mediaType === 'STORY') {
          return await this.facebookMediaService.postVideoStory(pageId, pageAccessToken, singleUrl);
        }

        return await this.facebookMediaService.postPhotoStory(pageId, pageAccessToken, singleUrl);
      }

      throw new BadRequestException('Unsupported Facebook post type.');
    } catch (error) {
      const errorData = error.response?.data;
      console.error(
        'Error posting to Facebook:',
        errorData?.error || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to post to Facebook.',
      );
    }
  }





}
