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
      };

      if (!mediaUrl) {
        // ✅ Text-only
        createBody['text'] = content;
      } else if (
        mediaUrl.toLowerCase().endsWith('.jpg') ||
        mediaUrl.toLowerCase().endsWith('.jpeg') ||
        mediaUrl.toLowerCase().endsWith('.png')
      ) {
        // ✅ Image + caption
        createBody['media_type'] = 'image';
        createBody['image_url'] = mediaUrl;
        createBody['text'] = content;
      } else if (mediaUrl.toLowerCase().endsWith('.mp4')) {
        // ✅ Video + caption
        createBody['media_type'] = 'video';
        createBody['video_url'] = mediaUrl;
        createBody['text'] = content;
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

      // ✅ 4️⃣ Publish the container
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
      throw new InternalServerErrorException(
        err.response?.data?.error?.message || 'Failed to post to Threads',
      );
    }
  }
}
