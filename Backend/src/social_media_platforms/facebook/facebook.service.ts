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
  ) {
    const userAccessToken = await this.facebookAuthService.getFacebookToken(userId);
    const pageAccessToken = await this.facebookAuthService.getPageToken(userAccessToken, pageId);
  

    try {
      // Step 3: Determine post type and call the appropriate function
      if (mediaType === 'IMAGE') {
        if(Array.isArray(mediaUrls) && mediaUrls.length > 1){
          return  await this.facebookMediaService.postMultiplePhotos(pageId, pageAccessToken, content, mediaUrls);
        }
        else{
          const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;
        return await this.facebookMediaService.postPhoto(pageId, pageAccessToken, content, singleUrl);}

      } else if (mediaType === 'VIDEO') {
        const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;
        return await this.facebookMediaService.postRegularVideo(pageId, pageAccessToken, content, singleUrl);
      }else if (mediaType === 'REEL') {
        const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;
        return await this.facebookMediaService.postFacebookReel(pageId, pageAccessToken, content , singleUrl);
      }
      else if (mediaType === 'STORY') {
        const singleUrl = Array.isArray(mediaUrls) ? mediaUrls[0] : mediaUrls;
        const isVideo = ['.mp4', '.mov', '.avi'].some(ext => singleUrl.toLowerCase().endsWith(ext));
        if (isVideo) {
          return await this.facebookMediaService.postVideoStory(pageId, pageAccessToken, singleUrl);
        }
        else{
          return await this.facebookMediaService.postPhotoStory(pageId, pageAccessToken, singleUrl);
        }
      }
      else {
        throw new BadRequestException('Unsupported media type.');
      }
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