import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  // ✅ Extracted Base URLs and Configs
  private readonly authBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly authScope: string;
  private readonly postCharLimit: number;

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // ✅ Load from environment with safe fallbacks
    this.authBaseUrl = this.config.get<string>('LINKEDIN_AUTH_BASE_URL') !;
    this.apiBaseUrl = this.config.get<string>('LINKEDIN_API_BASE_URL') !;
    this.authScope = this.config.get<string>('LINKEDIN_SCOPE') !;
    this.postCharLimit = this.config.get<number>('LINKEDIN_POST_CHAR_LIMIT') !;
  }

  private getRedirectUri(): string {
    const url = this.config.get<string>('LINKEDIN_CALLBACK_URL');
    if (!url) throw new InternalServerErrorException('LINKEDIN_CALLBACK_URL not defined in .env');
    return url;
  }

  generateAuthUrl(userId: number) {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.getRedirectUri();
    
    const state = encodeURIComponent(JSON.stringify({ 
      userId, 
      nonce: crypto.randomBytes(16).toString('hex') 
    }));

    // ✅ Replaced hardcoded URL and Scope
    return `${this.authBaseUrl}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(this.authScope)}&state=${state}`;
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
        // ✅ Replaced hardcoded URL
        this.httpService.post(`${this.authBaseUrl}/accessToken`, params, {
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
        // ✅ Replaced hardcoded URL
        this.httpService.get(`${this.apiBaseUrl}/userinfo`, {
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
        // ✅ Replaced hardcoded URL
        this.httpService.post(`${this.apiBaseUrl}/assets?action=registerUpload`, body, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      
      const uploadMechanism = response.data.value.uploadMechanism;
      const asset = response.data.value.asset;
      const uploadUrl = uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

      return { uploadUrl, asset };
    } catch (error: any) {
      this.logger.error('LinkedIn Register Upload Failed', error.response?.data);
      throw new InternalServerErrorException('Failed to register media upload with LinkedIn.');
    }
  }

  private async uploadBinary(uploadUrl: string, fileBuffer: Buffer, accessToken: string) {
    try {
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
    mediaArray?: { url: string; type: 'IMAGE' | 'VIDEO' }[]
  ) {
    try {
    const authorUrn = `urn:li:person:${providerId}`;
    let shareMediaCategory = 'NONE';
    let mediaAssets: any[] = [];

    // ✅ Replaced hardcoded char limit
    if (text.length > this.postCharLimit) {
      throw new BadRequestException(`Text exceeds LinkedIn limit of ${this.postCharLimit} characters.`);
    }

    // If media is provided, process multiple images only
    if (mediaArray && mediaArray.length > 0) {
      // Validate: Only images allowed for carousel
      const nonImages = mediaArray.filter(m => m.type !== 'IMAGE');
      if (nonImages.length > 0) {
        throw new BadRequestException('LinkedIn carousel posts only support images. Videos are not allowed in carousels.');
      }

      // Process all image items concurrently
      const uploadTasks = mediaArray.map(async (media, index) => {
        try {
          // 1. Download file
          const fileBuffer = await this.downloadMedia(media.url);

          // 2. Register Upload (only IMAGE type)
          const { uploadUrl, asset } = await this.registerUpload(accessToken, authorUrn, 'IMAGE');

          // 3. Upload File
          await this.uploadBinary(uploadUrl, fileBuffer, accessToken);

          // 4. Return asset data
          return {
            status: 'READY',
            description: { text: text.substring(0, 200) },
            media: asset,
            title: { text: `Image ${index + 1}` },
          };
        } catch (error) {
          this.logger.error(`Failed to process image ${index + 1}:`, error);
          throw error;
        }
      });

      mediaAssets = await Promise.all(uploadTasks);

      // Set share media category for carousel
      shareMediaCategory = mediaArray.length === 1 ? 'IMAGE' : 'IMAGE'; // LinkedIn handles multiple images as carousel
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
        // ✅ Replaced hardcoded URL
        this.httpService.post(`${this.apiBaseUrl}/ugcPosts`, requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0', 
          },
        }),
      );

      return { success: true, postId: response.data.id };

    } else {
      // Text-only post
      const requestBody: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.apiBaseUrl}/ugcPosts`, requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }),
      );

      return { success: true, postId: response.data.id };
    }


  } catch (error: any) {
      this.logger.error('LinkedIn Post Failed', error.response?.data);
      throw new InternalServerErrorException(
        `LinkedIn Post Failed: ${JSON.stringify(error.response?.data)}`
      );
    }
  }
}