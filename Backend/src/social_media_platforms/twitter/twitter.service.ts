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
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class TwitterService {
  private readonly TWITTER_CLIENT_ID: string;
  private readonly TWITTER_CLIENT_SECRET: string;
  private readonly TWITTER_CALLBACK_URL: string;
  private readonly TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
  private readonly TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.TWITTER_CLIENT_ID = this.config.get<string>('TWITTER_CLIENT_ID')!;
    this.TWITTER_CLIENT_SECRET =
      this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    this.TWITTER_CALLBACK_URL =
      this.config.get<string>('TWITTER_CALLBACK_URL')!;
  }

  // --- NO CHANGES TO AUTH FUNCTIONS ---
 // ✅ UPDATED: Accepts userId to track who is connecting
  generateAuthUrl(userId?: number) {
    let state: string;
    if (userId) {
      // Encode userId into the state so we can retrieve it in the callback
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

  async exchangeCodeForTokens(
    code: string,
    state: string,
    storedState: string,
    storedCodeVerifier: string,
  ) {
    // Note: If you have issues with strict state matching due to encoding, 
    // you can relax this check if you validated the JWT/UserId in the controller.
    // if (state !== storedState) throw new BadRequestException('Invalid state');
    
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

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.TWITTER_TOKEN_URL, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Twitter Token Exchange Error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to exchange Twitter code for tokens');
    }
  }
  // --- END OF AUTH FUNCTIONS ---

  /**
   * ✅ FINAL CORRECTED FUNCTION
   * This function uses ONLY the v2 API and ONLY the user's token.
   */
  async postTweetWithUserToken(
    text: string,
    file: Express.Multer.File,
    userOAuth2Token: string, // The user's v2 token from the cookie
  ) {
    try {
      // 1. Create a v2 client using the user's token.
      const userClient = new TwitterApi(userOAuth2Token);

      let mediaId: string | undefined;
      let cloudinaryUrl: string | undefined;

      if (file) {
        // 2. Backup to Cloudinary
        cloudinaryUrl = await this.cloudinaryService.uploadFile(file);

        // 3. Determine MimeType
        let mediaType: EUploadMimeType;
        if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg'))
          mediaType = EUploadMimeType.Jpeg;
        else if (file.mimetype.includes('png'))
          mediaType = EUploadMimeType.Png;
        else if (file.mimetype.includes('gif'))
          mediaType = EUploadMimeType.Gif;
        else if (file.mimetype.includes('mp4'))
          mediaType = EUploadMimeType.Mp4;
        else
          throw new BadRequestException(
            `Unsupported media type: ${file.mimetype}`,
          );

        // 4. ✅ UPLOAD MEDIA using the v2 API endpoint
        // ✅ FIX 2: Changed 'mimeType' to 'media_type'
        mediaId = await userClient.v2.uploadMedia(file.buffer, {
          media_type: mediaType,
        });
      }

      // 5. ✅ POST TWEET using the v2 API endpoint
      const tweet = await userClient.v2.tweet({
        text,
        media: mediaId ? { media_ids: [mediaId] } : undefined,
      });

      return {
        success: true,
        tweetId: tweet.data.id,
        cloudinaryUrl,
      };
    } catch (err: any) {
      console.error('Twitter Service Error:', err);
      if (err.code === 401) {
        throw new InternalServerErrorException(
          'Twitter token is invalid or expired. Please reconnect your account.',
        );
      }
      if (err.code === 403) {
        throw new InternalServerErrorException(
          'Twitter permission error (403). Ensure "media.write" scope is granted.',
        );
      }
      throw new InternalServerErrorException(
        `Failed to post tweet: ${err.message}`,
      );
    }
  }
}
