import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';

@Injectable()
export class TwitterService {
  private readonly TWITTER_CLIENT_ID: string;
  private readonly TWITTER_CLIENT_SECRET: string;
  private readonly TWITTER_CALLBACK_URL: string;
  private readonly TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
  private readonly TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

  private readonly v1Client: TwitterApi;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.TWITTER_CLIENT_ID = this.config.get<string>('TWITTER_CLIENT_ID')!;
    this.TWITTER_CLIENT_SECRET = this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    this.TWITTER_CALLBACK_URL = this.config.get<string>('TWITTER_CALLBACK_URL')!;

    // ✅ OAuth 1.0a setup for posting with media
    this.v1Client = new TwitterApi({
      appKey: this.config.get<string>('TWITTER_API_KEY')!,
      appSecret: this.config.get<string>('TWITTER_API_SECRET')!,
      accessToken: this.config.get<string>('TWITTER_ACCESS_TOKEN')!,
      accessSecret: this.config.get<string>('TWITTER_ACCESS_SECRET')!,
    });
  }

  // 🔹 Generate OAuth 2.0 authorization URL
  generateAuthUrl() {
    const state = crypto.randomBytes(32).toString('hex');
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

    const url = new URL(this.TWITTER_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.TWITTER_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.TWITTER_CALLBACK_URL);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { url: url.toString(), state, codeVerifier };
  }

  // 🔹 Exchange OAuth 2.0 code for tokens
  async exchangeCodeForTokens(
    code: string,
    state: string,
    storedState: string,
    storedCodeVerifier: string,
  ) {
    if (state !== storedState)
      throw new BadRequestException('Invalid state');
    if (!storedCodeVerifier)
      throw new BadRequestException('Missing code verifier');

    const basicAuth = Buffer.from(
      `${this.TWITTER_CLIENT_ID}:${this.TWITTER_CLIENT_SECRET}`,
    ).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.TWITTER_CALLBACK_URL,
      code_verifier: storedCodeVerifier,
    });

    const response = await firstValueFrom(
      this.httpService.post(this.TWITTER_TOKEN_URL, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      }),
    );
    return response.data;
  }

  // 🔹 Post Tweet using OAuth 1.0a (supports images/videos)
  async postTweetOAuth1(text: string, mediaUrls?: string[]) {
    try {
      let mediaIds: string[] = [];

      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          const mediaResp = await firstValueFrom(
            this.httpService.get(url, { responseType: 'arraybuffer' }),
          );

          const contentType =
            mediaResp.headers['content-type'] || 'application/octet-stream';
          const buffer = Buffer.from(mediaResp.data);

          let mediaType: EUploadMimeType;
          if (contentType.includes('jpeg') || contentType.includes('jpg'))
            mediaType = EUploadMimeType.Jpeg;
          else if (contentType.includes('png'))
            mediaType = EUploadMimeType.Png;
          else if (contentType.includes('gif'))
            mediaType = EUploadMimeType.Gif;
          else if (contentType.includes('mp4'))
            mediaType = EUploadMimeType.Mp4;
          else
            throw new BadRequestException(
              `Unsupported media type: ${contentType}`,
            );

          // 🧩 Upload image/video file
          const mediaId = await this.v1Client.v1.uploadMedia(buffer, {
            mimeType: mediaType,
          });
          mediaIds.push(mediaId);
        }
      }

      // ✅ Twitter supports max 4 media (only 1 video allowed)
      const tweet = await this.v1Client.v2.tweet({
        text,
        media: mediaIds.length
          ? { media_ids: mediaIds.slice(0, 4) as [string] }
          : undefined,
      });

      return tweet;
    } catch (err: any) {
      console.error('OAuth1 Tweet Error:', err);
      throw new InternalServerErrorException(
        `Failed to post tweet with media: ${err.message}`,
      );
    }
  }
}
