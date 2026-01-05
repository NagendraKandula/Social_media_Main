import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private getRedirectUri(): string {
    const url = this.config.get<string>('LINKEDIN_CALLBACK_URL');
    if (!url) throw new InternalServerErrorException('LINKEDIN_CALLBACK_URL not defined in .env');
    return url;
  }

  generateAuthUrl(userId: number) {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.getRedirectUri();
    const scope = ['openid', 'profile', 'email', 'w_member_social'].join(' ');
    const state = encodeURIComponent(JSON.stringify({ 
      userId, 
      nonce: crypto.randomBytes(16).toString('hex') 
    }));

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&state=${state}`;
  }

  async exchangeCodeForToken(code: string) {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.getRedirectUri();

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri); 
    params.append('client_id', clientId!);
    params.append('client_secret', clientSecret!);

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return response.data; 
    } catch (error: any) {
      this.logger.error(`LinkedIn Token Exchange Failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      throw new InternalServerErrorException('Failed to exchange LinkedIn code.');
    }
  }

  async getUserProfile(accessToken: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data; 
    } catch (error) {
      this.logger.error('Failed to fetch profile', error);
      throw new InternalServerErrorException('Failed to fetch LinkedIn profile');
    }
  }

  

  // --- Media Handling Helpers ---

  private async downloadMedia(url: string): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer' })
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download media from ${url}`, error);
      throw new BadRequestException('Failed to download media from provided URL.');
    }
  }

  private async registerUpload(accessToken: string, personUrn: string, mediaType: 'IMAGE' | 'VIDEO') {
    const recipe = mediaType === 'IMAGE' 
      ? 'urn:li:digitalmediaRecipe:feedshare-image' 
      : 'urn:li:digitalmediaRecipe:feedshare-video';

    const body = {
      registerUploadRequest: {
        recipes: [recipe],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.linkedin.com/v2/assets?action=registerUpload', body, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      
      const uploadMechanism = response.data.value.uploadMechanism;
      const asset = response.data.value.asset;
      // LinkedIn returns: "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      const uploadUrl = uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

      return { uploadUrl, asset };
    } catch (error: any) {
      this.logger.error('LinkedIn Register Upload Failed', error.response?.data);
      throw new InternalServerErrorException('Failed to register media upload with LinkedIn.');
    }
  }

  private async uploadBinary(uploadUrl: string, fileBuffer: Buffer, accessToken: string) {
    try {
      // Upload directly to the URL provided by LinkedIn. 
      // Note: Some docs suggest Authorization header is needed, some say the URL is signed. 
      // Including the token usually doesn't hurt for LinkedIn API endpoints.
      await firstValueFrom(
        this.httpService.post(uploadUrl, fileBuffer, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream' 
          },
        }),
      );
    } catch (error: any) {
      this.logger.error('LinkedIn Binary Upload Failed', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to upload media binary to LinkedIn.');
    }
  }

  // --- Main Post Method ---

  async postToLinkedIn(
    accessToken: string, 
    providerId: string, 
    text: string, 
    media?: { url: string; type: 'IMAGE' | 'VIDEO' }
  ) {
    const authorUrn = `urn:li:person:${providerId}`;
    let shareMediaCategory = 'NONE';
    let mediaAssets: any[] = [];
 
    // If media is provided, process it
    if (media && media.url) {
      
      
    if (text.length > 3000) {
    throw new BadRequestException('Text exceeds LinkedIn limit of 3000 characters.');
    }
      // 1. Download file
      const fileBuffer = await this.downloadMedia(media.url);
      
      // 2. Register Upload
      const { uploadUrl, asset } = await this.registerUpload(accessToken, authorUrn, media.type);
      
      // 3. Upload File
      await this.uploadBinary(uploadUrl, fileBuffer, accessToken);

      // 4. Prepare Post Metadata
      shareMediaCategory = media.type; // 'IMAGE' or 'VIDEO'
      mediaAssets = [
        {
          status: 'READY',
          description: { text: text.substring(0, 200) }, // Optional description
          media: asset,
          title: { text: 'Shared Media' },
        },
      ];
    }

    try {
      const requestBody: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: text },
            shareMediaCategory: shareMediaCategory,
            media: mediaAssets.length > 0 ? mediaAssets : undefined,
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await firstValueFrom(
        this.httpService.post('https://api.linkedin.com/v2/ugcPosts', requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0', 
          },
        }),
      );

      return { success: true, postId: response.data.id };

    } catch (error: any) {
      this.logger.error('LinkedIn Post Failed', error.response?.data);
      throw new InternalServerErrorException(
        `LinkedIn Post Failed: ${JSON.stringify(error.response?.data)}`
      );
    }
  }
}