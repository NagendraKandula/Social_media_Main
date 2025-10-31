import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // <-- 1. Import
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InstagramBusinessService {
  private readonly instagramAppId: string;
  private readonly instagramAppSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // <-- 2. Inject
  ) {
    // 3. Load variables in the constructor
    this.instagramAppId = this.configService.get<string>('INSTAGRAM_APP_ID')!;
    this.instagramAppSecret =
      this.configService.get<string>('INSTAGRAM_APP_SECRET')!;
    this.redirectUri =this.configService.get<string>('INSTAGRAM_REDIRECT_URL')!; // You can also move this to your .env file

    // 4. Validate them on startup
    if (!this.instagramAppId) {
      throw new InternalServerErrorException(
        'INSTAGRAM_APP_ID is not configured in .env',
      );
    }
    if (!this.instagramAppSecret) {
      throw new InternalServerErrorException(
        'INSTAGRAM_APP_SECRET is not configured in .env',
      );
    }
    if (!this.redirectUri) {
      throw new InternalServerErrorException(
        'INSTAGRAM_REDIRECT_URL is not configured in .env',
      );
    }
  }

  /**
   * Exchanges an authorization code for an Instagram User Access Token.
   */
  async handleInstagramCallback(code: string): Promise<any> {
    const url = 'https://api.instagram.com/oauth/access_token';
    const params = new URLSearchParams();

    // 5. Use the guaranteed-to-be-string class properties
    // This fixes your errors!
    params.append('client_id', this.instagramAppId);
    params.append('client_secret', this.instagramAppSecret);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', this.redirectUri);
    params.append('code', code);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const shortLivedToken = response.data.access_token;
      const userId = response.data.user_id;

      const longLivedToken =
        await this.getInstagramLongLivedToken(shortLivedToken);

      return {
        accessToken: longLivedToken,
        userId: userId,
      };
    } catch (error) {
      console.error(
        'Instagram Token Exchange Failed:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to exchange Instagram code for token.');
    }
  }

  /**
   * Exchanges a short-lived Instagram token for a long-lived one.
   */
  private async getInstagramLongLivedToken(
    shortLivedToken: string,
  ): Promise<string> {
    const url = `https://graph.instagram.com/access_token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'ig_exchange_token');

    // 5. Use the class property here too
    // This fixes your other error on line 57
    params.append('client_secret', this.instagramAppSecret);
    params.append('access_token', shortLivedToken);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );
      return response.data.access_token;
    } catch (error) {
      console.error(
        'Instagram Long-Lived Token Failed:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to get long-lived Instagram token.');
    }
  }
  async postToInstagram(
    accessToken: string,
    instagramUserId: string,
    imageUrl: string,
    caption: string,
  )
  {
    try {
      // --- Step 1: Create Media Container ---
      const createContainerUrl = `https://graph.facebook.com/v19.0/${instagramUserId}/media`;
      const containerParams = {
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken,
      };

      const containerResponse = await firstValueFrom(
        this.httpService.post(createContainerUrl, null, { params: containerParams }),
      );

      const containerId = containerResponse.data.id;
      if (!containerId) {
        throw new Error('Failed to create media container.');
      }

      console.log('Media container created:', containerId);

      // --- Step 2: Publish Media Container ---
      const publishUrl = `https://graph.facebook.com/v19.0/${instagramUserId}/media_publish`;
      const publishParams = {
        creation_id: containerId,
        access_token: accessToken,
      };

      const publishResponse = await firstValueFrom(
        this.httpService.post(publishUrl, null, { params: publishParams }),
      );

      console.log('Post published successfully:', publishResponse.data);
      return {
        success: true,
        postId: publishResponse.data.id,
      };
    } catch (error) {
      console.error(
        'Failed to post to Instagram:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to post to Instagram',
        error.response?.data?.error?.message,
      );
         }

    }
}