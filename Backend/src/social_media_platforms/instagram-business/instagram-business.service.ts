import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InstagramBusinessService {
  private readonly logger = new Logger(InstagramBusinessService.name);

  constructor(private readonly httpService: HttpService) {}


  async publishContent(
    userId: string,
    accessToken: string,
    mediaType: 'IMAGE' |'VIDEO'| 'REELS' | 'STORIES'| 'CAROUSEL',
    mediaSource : string | string[], // Accept either a single URL or an array for carousel
    caption?: string,
  ) {
    try {
      this.logger.log(`🚀 Starting publish for ${mediaType} on user ${userId}`);
      let masterCreationId: string;

       // ==========================================
      // 🔄 CAROUSEL LOGIC
      // ==========================================
      // ==========================================
      // 🔄 FAST CAROUSEL LOGIC (Fully Optimized)
      // ==========================================
      if (mediaType === 'CAROUSEL') {
        const urls = mediaSource as string[]; 

        // Optional but recommended validation

        this.logger.log(`🖼 Creating ${urls.length} child containers concurrently...`);
        const childContainerIds = await Promise.all(
          urls.map((url) => this.createCarouselItemContainer(userId, accessToken, url))
        );
        
        this.logger.log(`⏳ Waiting for all child containers to process concurrently...`);
        await Promise.all(
          childContainerIds.map((id) => this.waitForContainerProcessing(id, accessToken))
        );
        
        this.logger.log(`📦 Creating Master Carousel Container...`);
        masterCreationId = await this.createMasterCarouselContainer(userId, accessToken, childContainerIds, caption);

        // ✅ THE CRITICAL FIX: Wait for the master container to finish bundling
        this.logger.log(`⏳ Waiting for master carousel container to process...`);
        await this.waitForContainerProcessing(masterCreationId, accessToken);
      }

      else{
      // 1️⃣ Create Media Container
      masterCreationId = await this.createMediaContainer(
        userId,
        accessToken,
        mediaType,
        mediaSource as string, // Type assertion for single media
        caption,
      );

      // 2️⃣ Wait for Processing (Crucial for Videos/Reels)
      await this.waitForContainerProcessing(masterCreationId, accessToken);
    }
      // 3️⃣ Finalize & Publish
      const result = await this.publishMediaContainer(
        userId,
        accessToken,
        masterCreationId,
      );

      this.logger.log(`✅ Successfully published ${mediaType}: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Publish Failed:`, error.response?.data || error.message);
      throw new BadRequestException(
        `Instagram Publish Failed: ${JSON.stringify(error.response?.data?.error?.message || error.message)}`,
      );
    }
  }
   // --- CAROUSEL SPECIFIC HELPERS ---

  private async createCarouselItemContainer(userId: string, accessToken: string, mediaUrl: string): Promise<string> {
    const url = `https://graph.instagram.com/v24.0/${userId}/media`;
    const isVideo = mediaUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i); // Auto-detect video
    
    let params: any = { 
      access_token: accessToken,
      is_carousel_item: true // ⚠️ Required by Meta for carousel children
    };

    if (isVideo) {
      params.media_type = 'VIDEO';
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }

    const response = await firstValueFrom(this.httpService.post(url, null, { params }));
    return response.data.id;
  }
private async createMasterCarouselContainer(userId: string, accessToken: string, childrenIds: string[], caption?: string): Promise<string> {
    const url = `https://graph.instagram.com/v24.0/${userId}/media`;
    let params: any = {
      access_token: accessToken,
      media_type: 'CAROUSEL',
      children: childrenIds.join(',') // ⚠️ Meta requires a comma-separated string of IDs
    };
    
    if (caption) params.caption = caption;

    const response = await firstValueFrom(this.httpService.post(url, null, { params }));
    return response.data.id;
  }
  // 🛠️ Step 1: Create Container
  private async createMediaContainer(
    userId: string,
    accessToken: string,
    mediaType: 'IMAGE' | 'REELS' | 'STORIES'|'VIDEO',
    mediaUrl: string,
    caption?: string,
  ): Promise<string> {
    const url = `https://graph.instagram.com/v24.0/${userId}/media`;
    
    let params: any = { access_token: accessToken };

    // --- LOGIC FOR DIFFERENT MEDIA TYPES ---

    // 1. Standard Feed Image
    if (mediaType === 'IMAGE') {
      params.image_url = mediaUrl;
      if (caption) params.caption = caption;
    } else if (mediaType === 'VIDEO') {
      params.media_type = 'VIDEO';
      params.video_url = mediaUrl;
      if (caption) params.caption = caption;
    }
    
    // 2. Reels (Video)
    else if (mediaType === 'REELS') {
      params.media_type = 'REELS';
      params.video_url = mediaUrl;
      if (caption) params.caption = caption;
      params.share_to_feed = true; // Show on profile grid
    } 
    
    // 3. Stories (Image OR Video)
    else if (mediaType === 'STORIES') {
      params.media_type = 'STORIES';
      
      // 🧠 Smart Detection: Check file extension
      const isVideo = mediaUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i);

      if (isVideo) {
        params.video_url = mediaUrl; // Video Story
      } else {
        params.image_url = mediaUrl; // Image Story
      }
      // ⚠️ Note: Stories DO NOT support captions via API
    }

    this.logger.log(`🖼 Creating container...`);

    const response = await firstValueFrom(
      this.httpService.post(url, null, { params }),
    );
    return response.data.id;
  }

  // 🛠️ Step 2: Poll Status (Wait for Video Processing)
  private async waitForContainerProcessing(creationId: string, accessToken: string) {
    let attempts = 0;
    const maxAttempts = 20; // Try for ~100 seconds
    const delay = 5000; // 5 seconds between checks

    while (attempts < maxAttempts) {
      const url = `https://graph.instagram.com/v24.0/${creationId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            fields: 'status_code,status',
            access_token: accessToken,
          },
        }),
      );

      const status = response.data.status_code;
      this.logger.log(`⏳ Container ${creationId} status: ${status}`);

      if (status === 'FINISHED') {
        return true; // Ready to publish
      }

      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`Media processing failed: ${response.data.status}`);
      }

      // Wait 5s before next check
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    throw new Error('Media processing timed out.');
  }

  // 🛠️ Step 3: Publish
  private async publishMediaContainer(
    userId: string,
    accessToken: string,
    creationId: string,
  ) {
    const url = `https://graph.instagram.com/v24.0/${userId}/media_publish`;
    const params = {
      creation_id: creationId,
      access_token: accessToken,
    };

    const response = await firstValueFrom(
      this.httpService.post(url, null, { params }),
    );
    return response.data;
  }
}