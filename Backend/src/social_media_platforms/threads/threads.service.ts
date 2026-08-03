import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ThreadsService {
  private readonly GRAPH_API_URL: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.GRAPH_API_URL = this.configService.get<string>('THREADS_GRAPH_API_URL') || 'https://graph.threads.net/v1.0';
  }

  private getThreadsErrorMessage(err: any) {
    return err.response?.data?.error?.message || err.response?.data?.message || err.message;
  }

  private isInvalidTokenError(err: any) {
    const error = err.response?.data?.error;
    return (
      error?.code === 190 ||
      /access token|session has been invalidated/i.test(error?.message || err.message || '')
    );
  }

  private throwThreadsError(err: any): never {
    const message = this.getThreadsErrorMessage(err) || 'Threads API request failed';

    if (this.isInvalidTokenError(err)) {
      throw new UnauthorizedException(
        `Threads account needs to be reconnected: ${message}`,
      );
    }

    throw new InternalServerErrorException(`Threads API error: ${message}`);
  }

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

        if (status === 'FINISHED') return true;
        
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

  async postToThreads(
    accessToken: string,
    content: string,
    mediaList?: Array<{ url: string; type?: 'IMAGE' | 'VIDEO' }>
  ) {
    let userId = '';

    try {
      if ((content || '').length > 500) {
        throw new BadRequestException('Threads text posts are limited to 500 characters.');
      }

      const meRes = await firstValueFrom(
        this.http.get(`${this.GRAPH_API_URL}/me?fields=id,username`, {
          params: { access_token: accessToken },
        }),
      );

      userId = meRes.data.id;

      if (mediaList && mediaList.length > 0) {
        if (mediaList.length > 10) {
          throw new BadRequestException('Max 10 media items allowed');
        }

        // =========================
        // 1. SINGLE IMAGE / VIDEO
        // =========================
        if (mediaList.length === 1) {
          const media = mediaList[0];
          const isVideo = media.type === 'VIDEO' || /\.(mp4|mov)(\?|$)/i.test(media.url);
          const isImage = media.type === 'IMAGE' || /\.(jpg|jpeg|png)(\?|$)/i.test(media.url);
          
          const body: any = {
            access_token: accessToken,
            text: content,
          };

          if (isImage) {
            body.media_type = 'IMAGE';
            body.image_url = media.url;
          } else if (isVideo) {
            body.media_type = 'VIDEO';
            body.video_url = media.url;
          } else {
            throw new BadRequestException('Threads media must be JPEG, PNG, MP4, or MOV.');
          }

          const res = await firstValueFrom(
            this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, body),
          );
          const containerId = res.data.id;

          await this.waitForContainer(containerId, accessToken, 20);

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
        }

        // =========================
        // 2. CAROUSEL POST
        // =========================
        const publishedIds: string[] = [];

        // Step A: Create media containers
        for (let i = 0; i < mediaList.length; i++) {
          const media = mediaList[i];

          const isImage = media.type === 'IMAGE' || /\.(jpg|jpeg|png)(\?|$)/i.test(media.url);
          const isVideo = media.type === 'VIDEO' || /\.(mp4|mov)(\?|$)/i.test(media.url);

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
          } else {
            throw new BadRequestException('Threads media must be JPEG, PNG, MP4, or MOV.');
          }

          const res = await firstValueFrom(
            this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, body),
          );

          const containerId = res.data.id;
          publishedIds.push(containerId);

          try {
            await this.waitForContainer(containerId, accessToken, 15);
          } catch (e) {
            console.warn(`⚠️ Media ${i + 1} timeout, continuing...`);
          }
        }

        // Step B: Create carousel container
        const carouselRes = await firstValueFrom(
          this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, {
            access_token: accessToken,
            media_type: 'CAROUSEL',
            children: publishedIds.join(','),
            text: content,
          }),
        );

        const carouselId = carouselRes.data.id;
        let processingTimeout = false;

        try {
          await this.waitForContainer(carouselId, accessToken, 20);
        } catch (e) {
          console.warn('⚠️ Carousel timeout, still proceeding...');
          processingTimeout = true;
        }

        // Step C: Publish Carousel
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
      }

      // =========================
      // 3. TEXT ONLY POST
      // =========================
      const res = await firstValueFrom(
        this.http.post(`${this.GRAPH_API_URL}/${userId}/threads`, {
          access_token: accessToken,
          text: content,
          media_type: 'TEXT',
        }),
      );

      const containerId = res.data.id;

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

    } catch (err: any) {
      console.error('❌ Threads error:', err.response?.data || err.message);
      this.throwThreadsError(err);
    }
  }
}