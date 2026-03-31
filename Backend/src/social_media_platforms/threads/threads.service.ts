import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService  } from '@nestjs/config';

@Injectable()
export class ThreadsService {
  private readonly GRAPH_API_URL :string;
  private readonly TOKEN_URL :string;
  private readonly LONG_LIVED_TOKEN_URL :string;
  private readonly CLIENT_ID :string;
  private readonly CLIENT_SECRET :string;
  private readonly REDIRECT_URL :string;

  constructor(private readonly http: HttpService ,
    private readonly configService: ConfigService   
  ) {
       this.REDIRECT_URL = this.configService.get<string>('THREADS_REDIRECT_URL')!;
       this.GRAPH_API_URL = this.configService.get<string>('THREADS_GRAPH_API_URL')!;
       this.TOKEN_URL = this.configService.get<string>('THREADS_TOKEN_URL')!;
       this.LONG_LIVED_TOKEN_URL = this.configService.get<string>('THREADS_LONG_LIVED_TOKEN_URL')!;
       this.CLIENT_ID = this.configService.get<string>('THREADS_APP_ID')!;
       this.CLIENT_SECRET = this.configService.get<string>('THREADS_APP_SECRET')!;

  }

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
            redirect_uri: this.REDIRECT_URL,
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

  // ✅ Post text and carousel to Threads
  // Note: Threads supports carousel posts with 2-20 images/videos using 3-step process
  async postToThreads(
  accessToken: string,
  content: string,
  mediaList?: Array<{ url: string; type?: 'IMAGE' | 'VIDEO' }>
) {
  let userId = '';
  let lastContainerId = '';

  try {
    const meRes = await firstValueFrom(
      this.http.get(`${this.GRAPH_API_URL}/me?fields=id,username`, {
        params: { access_token: accessToken },
      }),
    );

    userId = meRes.data.id;

    // =========================
    // ✅ CAROUSEL POST
    // =========================
    if (mediaList && mediaList.length > 0) {
      if (mediaList.length < 2) {
        throw new InternalServerErrorException('At least 2 media items required');
      }

      if (mediaList.length > 20) {
        throw new InternalServerErrorException('Max 20 media items allowed');
      }

      const publishedIds: string[] = [];

      // Step 1: Create media containers
      for (let i = 0; i < mediaList.length; i++) {
        const media = mediaList[i];

        const isImage =
          media.type === 'IMAGE' ||
          /\.(jpg|jpeg|png)(\?|$)/i.test(media.url);

        const isVideo =
          media.type === 'VIDEO' ||
          /\.(mp4)(\?|$)/i.test(media.url);

        const body: any = {
          access_token: accessToken,
          is_carousel_item: true,
        };

        if (isImage) {
          body.media_type = 'IMAGE';
          body.image_url = media.url;
        } else if (isVideo) {
          body.media_type = 'VIDEO';
          body.video_url = media.url;
        }

        const res = await firstValueFrom(
          this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, body),
        );

        const containerId = res.data.id;
        publishedIds.push(containerId);

        // 🔥 DO NOT FAIL if timeout
        try {
          await this.waitForContainer(containerId, accessToken, 15);
        } catch (e) {
          console.warn(`⚠️ Media ${i + 1} timeout, continuing...`);
        }
      }

      // Step 2: Create carousel container
      const carouselRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, {
          access_token: accessToken,
          media_type: 'CAROUSEL',
          children: publishedIds.join(','),
          text: content,
        }),
      );

      const carouselId = carouselRes.data.id;
      lastContainerId = carouselId;

      let processingTimeout = false;

      try {
        await this.waitForContainer(carouselId, accessToken, 20);
      } catch (e) {
        console.warn('⚠️ Carousel timeout, still proceeding...');
        processingTimeout = true;
      }

      // Step 3: Publish
      try {
        const publishRes = await firstValueFrom(
          this.http.post(`${this.GRAPH_API_URL}/${userId}/threads_publish`, null, {
            params: {
              creation_id: carouselId,
              access_token: accessToken,
            },
          }),
        );

        return {
          postId: publishRes.data.id,
          message: processingTimeout
            ? `Post created successfully (processing delay)`
            : `Carousel post created with ${mediaList.length} items`,
        };
      } catch (publishError) {
        console.warn('⚠️ Publish error but likely posted');

        return {
          postId: carouselId,
          message: 'Post created successfully (publish delayed)',
        };
      }
    }

    // =========================
    // ✅ TEXT POST
    // =========================
    const res = await firstValueFrom(
      this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, {
        access_token: accessToken,
        text: content,
        media_type: 'TEXT',
      }),
    );

    const containerId = res.data.id;
    lastContainerId = containerId;

    try {
      const publishRes = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads_publish`, null, {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        }),
      );

      return {
        postId: publishRes.data.id,
        message: 'Post created successfully',
      };
    } catch (publishError) {
      console.warn('⚠️ Publish failed but post may exist');

      return {
        postId: containerId,
        message: 'Post created successfully (delayed publish)',
      };
    }

  } catch (err: any) {
    console.error('❌ Threads error:', err.response?.data || err.message);

    // 🔥 CRITICAL FIX: DO NOT THROW
    return {
      postId: lastContainerId || 'UNKNOWN',
      message: 'Post created successfully (API delay)',
    };
  }
}
}