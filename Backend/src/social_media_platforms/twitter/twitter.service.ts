import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
// 1. Import PrismaService
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwitterService {
  private readonly TWITTER_CLIENT_ID: string;
  private readonly TWITTER_CLIENT_SECRET: string;
  private readonly TWITTER_CALLBACK_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    // 2. Inject PrismaService
    private readonly prisma: PrismaService,
  ) {
    this.TWITTER_CLIENT_ID = this.config.get<string>('TWITTER_CLIENT_ID')!;
    this.TWITTER_CLIENT_SECRET = this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    this.TWITTER_CALLBACK_URL = this.config.get<string>('TWITTER_CALLBACK_URL')!;
  }

  generateAuthUrl(userId?: number) {
    let state: string;
    if (userId) {
      state = encodeURIComponent(
        JSON.stringify({
          userId,
          nonce: crypto.randomBytes(16).toString('hex'),
        }),
      );
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
      'offline.access', // Required for Refresh Token
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

      const { accessToken, refreshToken, expiresIn, scope } =
        await client.loginWithOAuth2({
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
      throw new InternalServerErrorException(
        'Failed to exchange Twitter code for tokens',
      );
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
        throw new InternalServerErrorException(
          'Twitter Rate Limit Exceeded. Please try again later.',
        );
      }
      throw new InternalServerErrorException(
        'Failed to fetch Twitter user profile',
      );
    }
  }

  // 3. New Helper: Refreshes the token using the stored refresh_token
  async refreshAccessToken(refreshToken: string) {
    try {
      const client = new TwitterApi({
        clientId: this.TWITTER_CLIENT_ID,
        clientSecret: this.TWITTER_CLIENT_SECRET,
      });

      const {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await client.refreshOAuth2Token(refreshToken);

      return { accessToken, newRefreshToken, expiresIn };
    } catch (error) {
      console.error('Failed to refresh Twitter token:', error);
      return null;
    }
  }

  // 4. Main Method: Handles posting + Automatic Refresh Logic
  async postTweetWithUserToken(
    text: string,
    file: Express.Multer.File,
    userOAuth2Token: string,
    userId: number, // <--- New Argument required for DB lookup
  ) {
    try {
      // Attempt 1: Try with current token
      return await this.attemptTweet(text, file, userOAuth2Token);
    } catch (err: any) {
      
      // Check for 401 Unauthorized (Expired Token)
      if (err.code === 401) {
        console.log('⚠️ Twitter Access Token expired. Attempting refresh...');

        // 1. Get the user's stored refresh token
        const account = await this.prisma.socialAccount.findFirst({
          where: { userId, provider: 'twitter' },
        });

        if (account?.refreshToken) {
          // 2. Attempt to refresh
          const newTokens = await this.refreshAccessToken(account.refreshToken);

          if (newTokens) {
            // 3. Update Database with NEW tokens
            await this.prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.newRefreshToken,
                expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
                updatedAt: new Date(),
              },
            });

            console.log('✅ Twitter Token Refreshed. Retrying tweet...');

            // 4. Retry Tweet with NEW Access Token
            return await this.attemptTweet(text, file, newTokens.accessToken);
          }
        }
      }

      // If generic error OR refresh failed, throw exception
      console.error('Twitter Service Error:', err);
      if (err.code === 403) {
        throw new InternalServerErrorException(
          'Twitter permission error (403). Ensure "media.write" scope is granted.',
        );
      }
      throw new InternalServerErrorException(
        `Failed to post tweet: ${err.message || 'Session expired, please reconnect.'}`,
      );
    }
  }

  // 5. Helper: The actual posting logic (extracted to avoid duplication)
  private async attemptTweet(
    text: string,
    file: Express.Multer.File,
    token: string,
  ) {
    const userClient = new TwitterApi(token);

    let mediaId: string | undefined;
    let cloudinaryUrl: string | undefined;

    if (file) {
      cloudinaryUrl = await this.cloudinaryService.uploadFile(file);

      let mediaType: EUploadMimeType;
      // Simple mime type check
      if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg'))
        mediaType = EUploadMimeType.Jpeg;
      else if (file.mimetype.includes('png')) mediaType = EUploadMimeType.Png;
      else if (file.mimetype.includes('gif')) mediaType = EUploadMimeType.Gif;
      else if (file.mimetype.includes('mp4')) mediaType = EUploadMimeType.Mp4;
      else
        throw new BadRequestException(
          `Unsupported media type: ${file.mimetype}`,
        );

      mediaId = await userClient.v2.uploadMedia(file.buffer, {
        media_type: mediaType,
      });
    }

    const tweet = await userClient.v2.tweet({
      text,
      media: mediaId ? { media_ids: [mediaId] } : undefined,
    });

    return {
      success: true,
      tweetId: tweet.data.id,
      cloudinaryUrl,
    };
  }
}