import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';
import { StorageService } from '../../storage/storage.service'; // ✅ Using StorageService

@Injectable()
export class TwitterService {
  private readonly TWITTER_CLIENT_ID: string;
  private readonly TWITTER_CLIENT_SECRET: string;
  private readonly TWITTER_CALLBACK_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.TWITTER_CLIENT_ID = this.config.get<string>('TWITTER_CLIENT_ID')!;
    this.TWITTER_CLIENT_SECRET = this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    this.TWITTER_CALLBACK_URL = this.config.get<string>('TWITTER_CALLBACK_URL')!;
  }

  // ... (Auth generation methods remain the same) ...
  generateAuthUrl(userId?: number) {
    let state: string;
    if (userId) {
      state = encodeURIComponent(JSON.stringify({ userId, nonce: crypto.randomBytes(16).toString('hex') }));
    } else {
      state = crypto.randomBytes(32).toString('hex');
    }

    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const scopes = [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
      'media.write',
    ].join(' ');

    const url = new URL('https://twitter.com/i/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.TWITTER_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.TWITTER_CALLBACK_URL);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { url: url.toString(), state, codeVerifier };
  }

  async exchangeCodeForTokens(
    code: string,
    state: string,
    storedState: string,
    storedCodeVerifier: string,
  ) {
    if (!storedCodeVerifier)
      throw new BadRequestException('Missing code verifier');

    try {
      const client = new TwitterApi({
        clientId: this.TWITTER_CLIENT_ID,
        clientSecret: this.TWITTER_CLIENT_SECRET,
      });

      const { accessToken, refreshToken, expiresIn, scope } = await client.loginWithOAuth2({
        code,
        codeVerifier: storedCodeVerifier,
        redirectUri: this.TWITTER_CALLBACK_URL,
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        scope,
      };

    } catch (error: any) {
      console.error('Twitter Token Exchange Error:', error);
      throw new InternalServerErrorException('Failed to exchange Twitter code for tokens');
    }
  }

  async getTwitterUser(accessToken: string) {
    try {
      const client = new TwitterApi(accessToken);
      const currentUser = await client.v2.me();
      return currentUser.data; 
    } catch (error: any) {
      console.error('Failed to fetch Twitter user:', error);
      if (error.code === 429) {
        throw new InternalServerErrorException('Twitter Rate Limit Exceeded. Please try again later.');
      }
      throw new InternalServerErrorException('Failed to fetch Twitter user profile');
    }
  }

  // ✅ UPDATED METHOD
  async postTweetWithUserToken(
    text: string,
    mediaPath: string | undefined,
    userOAuth2Token: string,
  ) {
    try {
      const userClient = new TwitterApi(userOAuth2Token);
      let mediaId: string | undefined;

      // ---------------------------------------------------------
      // 1️⃣ MEDIA UPLOAD (Uses API v1.1)
      // ---------------------------------------------------------
      if (mediaPath) {
        // 1. Download file from Google Storage
        const signedUrl = await this.storageService.getSignedReadUrl(mediaPath);
        const response = await this.httpService.axiosRef.get(signedUrl, {
          responseType: 'arraybuffer',
        });
        
        const buffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'];

        // 2. Determine Twitter Media Type
        let mediaTypeEnum: EUploadMimeType;
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) mediaTypeEnum = EUploadMimeType.Jpeg;
        else if (mimeType.includes('png')) mediaTypeEnum = EUploadMimeType.Png;
        else if (mimeType.includes('gif')) mediaTypeEnum = EUploadMimeType.Gif;
        else if (mimeType.includes('mp4')) mediaTypeEnum = EUploadMimeType.Mp4;
        else throw new BadRequestException(`Unsupported media type: ${mimeType}`);

        // 3. Upload using v1 API (Standard for Media)
        try {
            // 👇 THIS IS THE KEY CHANGE: .v1.uploadMedia
            mediaId = await userClient.v1.uploadMedia(buffer, {
              mimeType: mediaTypeEnum,
            });
        } catch (uploadError: any) {
            console.error("Twitter Media Upload Error:", uploadError);
            if (uploadError.code === 403) {
                throw new Error("Twitter Free Tier does not support Media Uploads. Please upgrade to Basic Tier or post text only.");
            }
            throw uploadError;
        }
      }

      // ---------------------------------------------------------
      // 2️⃣ POST TWEET (Uses API v2)
      // ---------------------------------------------------------
      const tweet = await userClient.v2.tweet({
        text,
        media: mediaId ? { media_ids: [mediaId] } : undefined,
      });

      return {
        success: true,
        tweetId: tweet.data.id,
        mediaPath, 
      };

    } catch (err: any) {
      console.error('Twitter Service Error:', err);
      if (err.message && err.message.includes('Free Tier')) {
          throw new BadRequestException(err.message);
      }
      if (err.code === 401) {
        throw new InternalServerErrorException('Twitter token is invalid or expired. Please reconnect your account.');
      }
      if (err.code === 403) {
        throw new InternalServerErrorException('Twitter permission error (403). Ensure "media.write" scope is granted.');
      }
      throw new InternalServerErrorException(`Failed to post tweet: ${err.message}`);
    }
  }
}