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
    // Ensuring we always use the exact string from env
    const url = this.config.get<string>('LINKEDIN_CALLBACK_URL');
    if (!url) throw new InternalServerErrorException('LINKEDIN_CALLBACK_URL not defined in .env');
    return url;
  }

  generateAuthUrl(userId: number) {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.getRedirectUri();

    const scope = [
      'openid',
      'profile',
      'email',
      'w_member_social', // Personal Posting
      // 'w_organization_social' // Uncomment when Company Page is approved
    ].join(' ');

    const state = encodeURIComponent(JSON.stringify({ 
      userId, 
      nonce: crypto.randomBytes(16).toString('hex') 
    }));

    // Manual construction to ensure encoding is perfect
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&state=${state}`;

    return url;
  }

  async exchangeCodeForToken(code: string) {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.getRedirectUri();

    // LinkedIn requires form-url-encoded body
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
      // LOGGING THE ACTUAL ERROR from LinkedIn
      this.logger.error(
        `LinkedIn Token Exchange Failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`
      );
      throw new InternalServerErrorException('Failed to exchange LinkedIn code. Check server logs.');
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

  async postToLinkedIn(accessToken: string, providerId: string, text: string) {
    try {
      const authorUrn = `urn:li:person:${providerId}`;

      const requestBody = {
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