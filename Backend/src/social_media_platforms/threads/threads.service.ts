
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ThreadsService {
  private readonly GRAPH_API_URL = 'https://graph.threads.net/v1.0';
  private readonly TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
  private readonly LONG_LIVED_TOKEN_URL = 'https://graph.threads.net/access_token'; // ✅ Added URL
  private readonly CLIENT_ID = process.env.THREADS_APP_ID;
  private readonly CLIENT_SECRET = process.env.THREADS_APP_SECRET;
  private readonly REDIRECT_URI =
    'https://unsecretive-unlearned-alexzander.ngrok-free.dev/threads/callback';

  constructor(private readonly http: HttpService) {}

  // ✅ Updated: Exchange code → Short Token → Long Token
  async exchangeCodeForTokens(code: string) {
    try {
      // 1️⃣ Get Short-Lived Token & User ID
      console.log('🔄 Exchanging code for short-lived token...');
      const shortRes = await firstValueFrom(
        this.http.post(this.TOKEN_URL, null, {
          params: {
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: this.REDIRECT_URI,
            code,
          },
        }),
      );

      const { access_token: shortToken, user_id } = shortRes.data;
      console.log('✅ Short-lived token received. User ID:', user_id);

      if (!shortToken) {
        throw new Error('No access_token received from short-lived exchange');
      }

      // 2️⃣ Exchange for Long-Lived Token (60 days)
      console.log('🔄 Exchanging for long-lived token...');
      const longRes = await firstValueFrom(
        this.http.get(this.LONG_LIVED_TOKEN_URL, {
          params: {
            grant_type: 'th_exchange_token',
            client_secret: this.CLIENT_SECRET,
            access_token: shortToken,
          },
        }),
      );

      const { access_token: longToken, expires_in } = longRes.data;
      console.log(`✅ Long-lived token received. Expires in: ${expires_in} seconds`);

      return {
        user_id, // Keep user_id from first call
        access_token: longToken, // Use the new long-lived token
        expires_in, // This should now be present (~5184000 seconds)
      };

    } catch (err: any) {
      console.error(
        '❌ Failed to exchange code for tokens:',
        err.response?.data || err.message,
      );
      throw new InternalServerErrorException('Failed to exchange code for tokens');
    }
  }

  // ✅ Helper to wait for media container to be ready
  private async waitForContainer(containerId: string, accessToken: string, maxRetries = 20) {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await firstValueFrom(
          this.http.get(`${this.GRAPH_API_URL}/${containerId}`, {
            params: {
              fields: 'status,error_message',
              access_token: accessToken,
            },
          }),
        );

        const { status, error_message } = response.data;
        console.log(`⏳ Checking container status (${i + 1}/${maxRetries}): ${status}`);

        if (status === 'FINISHED') {
          return true;
        }

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(`Media processing failed: ${error_message || status}`);
        }
      } catch (err: any) {
        console.warn(`⚠️ Warning checking container status: ${err.message}`);
      }
      await delay(3000);
    }
    throw new Error('Timeout waiting for media container to process');
  }

  // ✅ Post text / image / video to Threads
  async postToThreads(accessToken: string, content: string, mediaUrl?: string) {
    try {
      const meRes = await firstValueFrom(
        this.http.get(`${this.GRAPH_API_URL}/me?fields=id,username`, {
          params: { access_token: accessToken },
        }),
      );
      const userId = meRes.data.id;
      
      let createBody: Record<string, any> = {
        access_token: accessToken,
        text: content,
      };

      let isMediaPost = false;

      if (!mediaUrl) {
        createBody['media_type'] = 'TEXT';
      } else if (
        mediaUrl.toLowerCase().endsWith('.jpg') ||
        mediaUrl.toLowerCase().endsWith('.jpeg') ||
        mediaUrl.toLowerCase().endsWith('.png')
      ) {
        createBody['media_type'] = 'IMAGE'; 
        createBody['image_url'] = mediaUrl;
        isMediaPost = true;
      } else if (mediaUrl.toLowerCase().endsWith('.mp4')) {
        createBody['media_type'] = 'VIDEO';
        createBody['video_url'] = mediaUrl;
        isMediaPost = true;
      } else {
        throw new InternalServerErrorException(
          'Unsupported media type (only .jpg, .png, .mp4)',
        );
      }

      const containerRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, createBody),
      );

      const containerId = containerRes.data.id;
      console.log('🧩 Container created:', containerId);

      if (isMediaPost) {
        console.log('🕒 Waiting for media processing...');
        await this.waitForContainer(containerId, accessToken);
      }

      const publishRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads_publish`, null, {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        }),
      );

      return { postId: publishRes.data.id };
    } catch (err: any) {
      console.error('❌ Error posting to Threads:', err.response?.data || err.message);
      
      const apiError = err.response?.data?.error;
      const errorMessage = apiError 
        ? `${apiError.message} (Code: ${apiError.code})` 
        : err.message;

      throw new InternalServerErrorException(errorMessage);
    }
  }
}
