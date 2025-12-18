import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ThreadsService {
  private readonly GRAPH_API_URL = 'https://graph.threads.net/v1.0';
  private readonly TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
  private readonly CLIENT_ID = process.env.THREADS_APP_ID;
  private readonly CLIENT_SECRET = process.env.THREADS_APP_SECRET;
  private readonly REDIRECT_URI =
    'https://unsecretive-unlearned-alexzander.ngrok-free.dev/threads/callback';

  constructor(private readonly http: HttpService) {}

  // ✅ Exchange code → access token
  async exchangeCodeForTokens(code: string) {
    try {
      const response = await firstValueFrom(
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

      console.log('🔑 Token exchange response:', response.data);
      return response.data; // includes access_token & user_id
    } catch (err: any) {
      console.error(
        '❌ Failed to exchange code for tokens:',
        err.response?.data || err.message,
      );
      throw new InternalServerErrorException('Failed to exchange code for tokens');
    }
  }

  // ✅ Helper to wait for media container to be ready
  // FIXED: Removed 'status_code' field which was causing the 500 Error
  private async waitForContainer(containerId: string, accessToken: string, maxRetries = 20) {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await firstValueFrom(
          this.http.get(`${this.GRAPH_API_URL}/${containerId}`, {
            params: {
              fields: 'status,error_message', // ✅ FIXED: Request 'status' instead of 'status_code'
              access_token: accessToken,
            },
          }),
        );

        const { status, error_message } = response.data;
        console.log(`⏳ Checking container status (${i + 1}/${maxRetries}): ${status}`);

        if (status === 'FINISHED') {
          return true; // Ready to publish
        }

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(`Media processing failed: ${error_message || status}`);
        }
      } catch (err: any) {
        console.warn(`⚠️ Warning checking container status: ${err.message}`);
        // If it's a 500 or network error, we retry. If 400, it might be fatal, but we retry closely.
      }

      // Wait 3 seconds before next check
      await delay(3000);
    }
    throw new Error('Timeout waiting for media container to process');
  }

  // ✅ Post text / image / video to Threads
  async postToThreads(accessToken: string, content: string, mediaUrl?: string) {
    try {
      // ✅ 1️⃣ Get user_id from token
      const meRes = await firstValueFrom(
        this.http.get(`${this.GRAPH_API_URL}/me?fields=id,username`, {
          params: { access_token: accessToken },
        }),
      );
      const userId = meRes.data.id;
      console.log('👤 Threads user ID:', userId);

      // ✅ 2️⃣ Prepare the create container body
      let createBody: Record<string, any> = {
        access_token: accessToken,
        text: content,
      };

      let isMediaPost = false;

      if (!mediaUrl) {
        // ✅ Text-only (FIXED: Added media_type TEXT)
        createBody['media_type'] = 'TEXT';
      } else if (
        mediaUrl.toLowerCase().endsWith('.jpg') ||
        mediaUrl.toLowerCase().endsWith('.jpeg') ||
        mediaUrl.toLowerCase().endsWith('.png')
      ) {
        // ✅ Image + caption
        createBody['media_type'] = 'IMAGE'; 
        createBody['image_url'] = mediaUrl;
        isMediaPost = true;
      } else if (mediaUrl.toLowerCase().endsWith('.mp4')) {
        // ✅ Video + caption
        createBody['media_type'] = 'VIDEO';
        createBody['video_url'] = mediaUrl;
        isMediaPost = true;
      } else {
        throw new InternalServerErrorException(
          'Unsupported media type (only .jpg, .png, .mp4)',
        );
      }

      // ✅ 3️⃣ Create container (DRAFT)
      const containerRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, createBody),
      );

      const containerId = containerRes.data.id;
      console.log('🧩 Container created:', containerId);

      // ✅ 4️⃣ Wait for processing (Critical for both Image & Video to avoid "Media Not Found")
      if (isMediaPost) {
        console.log('🕒 Waiting for media processing...');
        await this.waitForContainer(containerId, accessToken);
      }

      // ✅ 5️⃣ Publish the container
      const publishRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads_publish`, null, {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        }),
      );

      console.log('✅ Post published:', publishRes.data);
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
