import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FacebookService } from '../social_media_platforms/facebook/facebook.service';
import { InstagramBusinessService } from '../social_media_platforms/instagram-business/instagram-business.service';
import { LinkedinService } from '../social_media_platforms/linkedin/linkedin.service';
import { YoutubeService } from '../social_media_platforms/youtube/youtube.service';
import { ThreadsService } from '../social_media_platforms/threads/threads.service';
import { TwitterService } from '../social_media_platforms/twitter/twitter.service';
import { Platform, PostStatus, MediaType, Placement, VariantStatus } from '@prisma/client';

@Processor('posting-queue')
export class PostingProcessor {
  private readonly logger = new Logger(PostingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly facebookService: FacebookService,
    private readonly instagramBusinessService: InstagramBusinessService,
    private readonly linkedinService: LinkedinService,
    private readonly youtubeService: YoutubeService,
    private readonly threadsService: ThreadsService,
    private readonly twitterService: TwitterService,
  ) {}

  private formatPlatformError(platform: string, error: any) {
    const response = error?.response;
    const responseData = response?.data ?? response;

    const message =
      responseData?.error?.message ||
      responseData?.error?.errors?.[0]?.message ||
      responseData?.message ||
      error?.message;

    if (message) {
      return `[${platform}] API Error: ${Array.isArray(message) ? message.join(', ') : message}`;
    }

    if (responseData) {
      return `[${platform}] Raw Error: ${JSON.stringify(responseData)}`;
    }

    return `[${platform}] Unknown error`;
  }

  @Process('publish-post')
  async handlePublish(job: Job<{ postId: number }>) {
    const { postId } = job.data;
    this.logger.log(`🚀 Processing Job for Post #${postId}`);

    // 1. Fetch Post with the new relational structure (using mediaSlots instead of mediaItems)
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        platforms: true,
        mediaSlots: {
          include: {
            media: true,
            edit: {
              include: { 
                variants: {
                   where: {
                   status: VariantStatus.READY,
                      },
                 },
              }
            }
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!post) {
      this.logger.error(`Post #${postId} not found`);
      return;
    }

    let hasFailures = false;

    // 2. Loop through platforms
    for (const platformEntry of post.platforms) {
      if (platformEntry.status === PostStatus.PUBLISHED) continue;

      try {
        this.logger.log(`📤 Posting to ${platformEntry.platform}...`);
        
        // Use primaryCaption (content and contentMetadata are gone in the new schema)
        const contentText = post.primaryCaption ?? '';
        let externalId = '';

        // Filter media slots specific to THIS platform
        const platformSlots = post.mediaSlots.filter(s => s.platform === platformEntry.platform);

        // Resolve URLs for this platform's media
        const mediaList = await Promise.all(
          platformSlots.map(async (slot) => {
            // Check if there is a ready, edited variant
            const readyVariant = slot.edit?.variants.find(v => v.status === VariantStatus.READY);
            
            // Use gcsPath from new Media schema
            const targetPath = readyVariant?.gcsPath || slot.media.gcsPath;
            let signedUrl = readyVariant?.cdnUrl || '';

            if (!signedUrl && targetPath) {
              try {
                signedUrl = await this.storageService.getSignedReadUrl(targetPath, 'application/octet-stream');
              } catch (e: any) {
                this.logger.warn(`Could not sign URL for ${targetPath}: ${e.message}`);
              }
            }

            return {
              url: signedUrl,
              storagePath: targetPath,
              type: slot.media.fileType, // IMAGE or VIDEO from new schema
              placement: slot.edit?.placement // FEED, STORY, REEL, etc.
            };
          })
        );
           const invalidMedia = mediaList.find((m) => !m.url || m.url.trim() === '');
        if (invalidMedia) {
          throw new Error(
            `Missing secure URL for media file (Path: ${invalidMedia.storagePath || 'Unknown'}). Ensure the file uploaded correctly to Google Cloud.`
          );
        }
        if (platformEntry.platform === Platform.FACEBOOK) {
            if (mediaList.length === 0) throw new Error('Media URL is required for Facebook');
            const pageId = (post as any).contentMetadata?.platformOverrides?.facebook?.pageId;
            if (!pageId) throw new Error('Facebook Page ID missing');
            const facebookPostType = (post as any).contentMetadata?.platformOverrides?.facebook?.postType || 'feed';

            const urlsParam = mediaList.length === 1 ? mediaList[0].url : mediaList.map((m: any) => m.url);

            const result = await this.facebookService.postToFacebook(
                post.userId, 
                pageId, 
                contentText, 
                urlsParam, 
                mediaList[0].type as any,
                facebookPostType,
            );
            
            externalId = result.postId || 'fb_id';
        }
         else if (platformEntry.platform === Platform.INSTAGRAM) {
            if (mediaList.length === 0) throw new Error('Media URL is required for Instagram');
            const account = await this.getAccount(post.userId, 'instagram');
            const instaMeta = (post.contentMetadata as any)?.platformOverrides?.instagram;
            const userPostType = instaMeta?.postType || 'post'; 
            if (mediaList.length === 1) {
    let apiMediaType: 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES';

    if (userPostType === 'story') {
        apiMediaType = 'STORIES';
    } else if (userPostType === 'reel') {
        apiMediaType = 'REELS';
    } else {
        // Normal feed post
        apiMediaType =
            mediaList[0].type === MediaType.VIDEO
                ? 'VIDEO'
                : 'IMAGE';
    }

    const result = await this.instagramBusinessService.publishContent(
        account.providerId,
        account.accessToken,
        apiMediaType,
        mediaList[0].url,
        contentText,
    );

    externalId = result.id;
}
            
            else {
                 const carouselMedia = mediaList.map((m: any) => ({
                    url: m.url,
                    type: m.type // Explicitly carry the type down!
                 }));
                 const result = await this.instagramBusinessService.publishContent(
                    account.providerId, 
                    account.accessToken, 
                    'CAROUSEL',   
                    carouselMedia,         
                    contentText
                 );
                 externalId = result.id || 'insta_carousel_id';
            }
        }
       else if (platformEntry.platform === Platform.LINKEDIN) {
          const account = await this.getAccount(post.userId, 'linkedin');
          const linkedInMedia = mediaList.length > 0
            ? mediaList.map((m) => ({ 
                url: m.url, 
                type: (m.type === MediaType.VIDEO ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO' 
              }))
            : undefined;
          const result = await this.linkedinService.postToLinkedIn(
            account.accessToken,
            account.providerId,
            contentText,
            linkedInMedia,
          );
          externalId = result?.postId || 'linkedin_id';
        } 
        else if (platformEntry.platform === Platform.THREADS) {
          const account = await this.getAccount(post.userId, 'threads');

          // ✅ FIXED: Explicitly casting as 'IMAGE' | 'VIDEO' to resolve TS Error 2345
          const threadsMedia = mediaList.length > 0
            ? mediaList.map((m) => ({
                url: m.url,
                type: (m.type === MediaType.VIDEO ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
              }))
            : undefined;

          const result = await this.threadsService.postToThreads(
            account.accessToken,
            contentText,
            threadsMedia,
          );
          externalId = result.postId || 'threads_id';
        }
        else if (platformEntry.platform === Platform.YOUTUBE) {
          if (mediaList.length === 0 || mediaList[0].type === MediaType.IMAGE) {
            throw new Error('Video file is required for YouTube');
          }
          
          // YouTube relies on SHORT placement to determine shorts vs video
          const videoType = mediaList[0].placement === Placement.SHORT ? 'SHORTS' : 'VIDEO';
          
          const result = await this.youtubeService.uploadVideoToYoutube(
            post.userId,
            'New Video', // Defaulting title
            contentText,
            videoType,
            mediaList[0].url,
          );
          externalId = result.videoId ?? 'unknown_id';
        } 
        else if (platformEntry.platform === Platform.TWITTER) {
          const account = await this.getAccount(post.userId, 'twitter');
          this.logger.log(`🐦 Posting to Twitter...`);

          const storagePaths = mediaList.map((m) => m.storagePath).filter(Boolean);

          const result = await this.twitterService.postTweetWithUserToken(
            contentText,
            storagePaths as string[],
            account.accessToken,
          );
          externalId = result.tweetId;
        }

        // Mark specific platform as published
        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { status: PostStatus.PUBLISHED, externalId: externalId, publishedAt: new Date() },
        });

      } catch (error: any) {
        const detailedError = this.formatPlatformError(platformEntry.platform, error);

        this.logger.error(`❌ FAILURE DETECTED on ${platformEntry.platform}: ${detailedError}`);

        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { 
            status: PostStatus.FAILED, 
            errorMessage: detailedError,
            retryCount: platformEntry.retryCount + 1
          },
        });

        hasFailures = true;
      }
    }

    // ---------------------------------------------------------
    // 🧹 CLEANUP & STATUS SECTION
    // ---------------------------------------------------------

    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        platforms: true,
        mediaSlots: { include: { media: true } },
      },
    });

    if (!updatedPost) {
      if (hasFailures) throw new Error('Some platforms failed to publish. Job will retry.');
      return;
    }

    const allSuccess = updatedPost.platforms.every((p) => p.status === PostStatus.PUBLISHED);
    const allFailed = updatedPost.platforms.every((p) => p.status === PostStatus.FAILED);

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: allSuccess
          ? PostStatus.PUBLISHED
          : allFailed
          ? PostStatus.FAILED
          : PostStatus.PARTIAL,
      },
    });

    // If fully successful, clean up the files in cloud storage
    if (allSuccess && updatedPost.mediaSlots.length > 0) {
      this.logger.log(`✨ All platforms success. Deleting media files from Cloud...`);

      for (const slot of updatedPost.mediaSlots) {
        if (slot.media?.gcsPath) {
          try {
            await this.storageService.deleteFile(slot.media.gcsPath);
          } catch (err: any) {
            this.logger.warn(`Failed to delete ${slot.media.gcsPath}: ${err.message}`);
          }
        }
      }
    }

    if (hasFailures) {
      throw new Error('Some platforms failed to publish. Job will retry.');
    }
  }

  private async getAccount(userId: number, provider: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: provider.toLowerCase() },
    });
    if (!account) throw new Error(`${provider} account not connected`);
    return account;
  }
}