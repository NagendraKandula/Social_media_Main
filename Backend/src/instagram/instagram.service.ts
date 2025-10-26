import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class InstagramService {
  private readonly FB_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper function to handle API errors
   * * FIX: Added ': never' return type to inform TypeScript 
   * that this function always throws and never returns a value.
   */
  private handleApiError(error: AxiosError, context: string): never {
    console.error(`Error during ${context}:`, error.response?.data);
    const apiError = (error.response?.data as any)?.error;
    if (apiError) {
      throw new BadRequestException(
        `Facebook API Error (${context}): ${apiError.message} (Code: ${apiError.code})`,
      );
    }
    throw new InternalServerErrorException(
      `Failed to ${context}. Please try again.`,
    );
  }

  /**
   * Step 1: Get the first Facebook Page ID and Page Access Token
   */
  private async getFacebookPageDetails(
    userAccessToken: string,
  ): Promise<{ pageId: string; pageAccessToken: string }> {
    try {
      const url = `${this.FB_GRAPH_API_URL}/me/accounts`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: { access_token: userAccessToken },
        }),
      );

      const pages = response.data.data;
      if (!pages || pages.length === 0) {
        throw new BadRequestException('No Facebook pages found for this user.');
      }

      // Use the first page
      const firstPage = pages[0];
      return {
        pageId: firstPage.id,
        pageAccessToken: firstPage.access_token,
      };
    } catch (error) {
      this.handleApiError(error, 'fetch Facebook pages');
    }
  }

  /**
   * Step 2: Get the Instagram Business Account ID from the Facebook Page ID
   */
  private async getInstagramAccountId(
    pageId: string,
    pageAccessToken: string,
  ): Promise<string> {
    try {
      const url = `${this.FB_GRAPH_API_URL}/${pageId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            fields: 'instagram_business_account',
            access_token: pageAccessToken,
          },
        }),
      );

      const igAccount = response.data.instagram_business_account;
      if (!igAccount) {
        throw new BadRequestException(
          'No Instagram Business Account linked to this Facebook Page.',
        );
      }
      return igAccount.id;
    } catch (error) {
      this.handleApiError(error, 'fetch Instagram account ID');
    }
  }

  /**
   * Step 3: Create a media container for the post
   */
  private async createMediaContainer(
    igAccountId: string,
    pageAccessToken: string,
    caption: string,
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO',
  ): Promise<string> {
    try {
      const url = `${this.FB_GRAPH_API_URL}/${igAccountId}/media`;
      const params: any = {
        access_token: pageAccessToken,
        caption: caption,
      };

      if (mediaType === 'IMAGE') {
        params.image_url = mediaUrl;
      } else {
        params.video_url = mediaUrl;
        params.media_type = 'VIDEO';
      }

      const response = await firstValueFrom(
        this.httpService.post(url, null, { params }),
      );

      return response.data.id; // This is the container_id
    } catch (error) {
      this.handleApiError(error, 'create media container');
    }
  }

  /**
   * Step 4: Poll the container status until it's FINISHED
   */
  private async pollContainerStatus(
    containerId: string,
    pageAccessToken: string,
  ): Promise<void> {
    const maxRetries = 10;
    const delayMs = 5000; // 5 seconds
    let retries = 0;

    const checkStatus = async () => {
      try {
        const url = `${this.FB_GRAPH_API_URL}/${containerId}`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            params: {
              fields: 'status_code',
              access_token: pageAccessToken,
            },
          }),
        );

        const status = response.data.status_code;
        console.log(`Container ${containerId} status: ${status}`);

        if (status === 'FINISHED') {
          return; // Success
        } else if (status === 'ERROR') {
          throw new InternalServerErrorException(
            'Media processing failed on Instagram.',
          );
        } else if (status === 'IN_PROGRESS' || status === 'PENDING') {
          retries++;
          if (retries > maxRetries) {
            throw new InternalServerErrorException('Media processing timed out.');
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          await checkStatus();
        }
      } catch (error) {
        this.handleApiError(error, 'poll container status');
      }
    };

    await checkStatus();
  }

  /**
   * Step 5: Publish the media container
   */
  private async publishMedia(
    igAccountId: string,
    containerId: string,
    pageAccessToken: string,
  ): Promise<string> {
    try {
      const url = `${this.FB_GRAPH_API_URL}/${igAccountId}/media_publish`;
      const response = await firstValueFrom(
        this.httpService.post(url, null, {
          params: {
            creation_id: containerId,
            access_token: pageAccessToken,
          },
        }),
      );

      return response.data.id; // This is the final post_id
    } catch (error) {
      this.handleApiError(error, 'publish media');
    }
  }

  /**
   * Main service method called by the controller
   */
  async postToInstagram(
    userAccessToken: string,
    content: string,
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO',
  ) {
    // Step 1: Get Page ID and Page Token
    const { pageId, pageAccessToken } = await this.getFacebookPageDetails(
      userAccessToken,
    );

    // Step 2: Get Instagram Account ID
    const igAccountId = await this.getInstagramAccountId(
      pageId,
      pageAccessToken,
    );

    // Step 3: Create Media Container
    const containerId = await this.createMediaContainer(
      igAccountId,
      pageAccessToken,
      content,
      mediaUrl,
      mediaType,
    );

    // Step 4: Poll for status (especially important for videos)
    await this.pollContainerStatus(containerId, pageAccessToken);

    // Step 5: Publish the media
    const postId = await this.publishMedia(
      igAccountId,
      containerId,
      pageAccessToken,
    );

    return {
      message: 'Post published to Instagram successfully!',
      postId: postId,
    };
  }
}