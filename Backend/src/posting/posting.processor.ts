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

@Processor('social-posting')
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

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { 
        platforms: true, 
        mediaItems: { 
          include: { media: true },
          orderBy: { position: 'asc' }
        } 
      },
    });

    if (!post) {
      this.logger.error(`Post #${postId} not found`);
      return;
    }

    const contentText = post.content || '';
    
    // ✅ FIX 1 & 3: Cast to any[] to bypass the 'never' error while Prisma Client updates
    const postMediaItems = (post as any).mediaItems || [];

    const mediaList = await Promise.all(
      postMediaItems.map(async (item: any) => {
        let signedUrl = item.media.fileUrl;
        if (item.media.storagePath) {
          try {
            signedUrl = await this.storageService.getSignedReadUrl(
              item.media.storagePath,
              item.media.mimeType,
            );
          } catch (e: any) { 
            // ✅ FIX 2: Added ': any' to 'e'
            this.logger.warn(`Could not sign URL for ${item.media.storagePath}: ${e.message}`);
          }
        }
        return {
          url: signedUrl,
          storagePath: item.media.storagePath,
          type: item.media.type, 
          mimeType: item.media.mimeType
        };
      })
    );

    let hasFailures = false;

    for (const platformEntry of post.platforms) {
      if (platformEntry.status === 'PUBLISHED') continue;

      try {
        let externalId = '';
        this.logger.log(`📤 Posting to ${platformEntry.platform}...`);

        if (platformEntry.platform === 'facebook') {
            if (mediaList.length === 0) throw new Error('Media URL is required for Facebook');
            const pageId = (post.contentMetadata as any)?.platformOverrides?.facebook?.pageId;
            if (!pageId) throw new Error('Facebook Page ID missing');
            const facebookPostType = (post.contentMetadata as any)?.platformOverrides?.facebook?.postType || 'feed';

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
       else if (platformEntry.platform === 'instagram') {
            if (mediaList.length === 0) throw new Error('Media URL is required for Instagram');
            const account = await this.getAccount(post.userId, 'instagram');
            const instaMeta = (post.contentMetadata as any)?.platformOverrides?.instagram;
            const userPostType = instaMeta?.postType || 'post'; 

            if (mediaList.length === 1) {
                let apiMediaType: 'IMAGE' | 'REELS' | 'STORIES' = 'IMAGE';
                
                if (userPostType === 'story') {
                    apiMediaType = 'STORIES';
                } else if (userPostType === 'reel') {
                    apiMediaType = 'REELS';
                } else {
                    if (mediaList[0].type === 'VIDEO') {
                        apiMediaType = 'REELS';
                    } else {
                        apiMediaType = 'IMAGE';
                    }
                }

                const result = await this.instagramBusinessService.publishContent(
                    account.providerId, account.accessToken, apiMediaType, mediaList[0].url, contentText
                );
                externalId = result.id;
            } else {
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
        else if (platformEntry.platform === 'linkedin') {
            const account = await this.getAccount(post.userId, 'linkedin');
            
            const linkedInMedia = mediaList.length > 0 
                ? mediaList.map((m: any) => ({ url: m.url, type: m.type as 'IMAGE' | 'VIDEO' })) 
                : undefined;
                
            const result = await this.linkedinService.postToLinkedIn(
                account.accessToken, account.providerId, contentText, linkedInMedia
            );
            externalId = result?.postId || 'linkedin_id';
        } 
       else if (platformEntry.platform === 'threads') {
            const account = await this.getAccount(post.userId, 'threads');
            
            const threadsMedia = mediaList.length > 0 
              ? mediaList.map((m: any) => ({ 
                  url: m.url, 
                 type: ((m.type === 'VIDEO' || m.type === 'REEL') ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO' }))
              : undefined;

            const result = await this.threadsService.postToThreads(
                account.accessToken, contentText, threadsMedia
            );
            externalId = result.postId || 'threads_id';
        }
        
        else if (platformEntry.platform === 'youtube') {
           if (mediaList.length === 0 || mediaList[0].type === 'IMAGE') {
              throw new Error('Video file is required for YouTube');
            }
            const title = (post.contentMetadata as any)?.title || 'New Video';
            const result = await this.youtubeService.uploadVideoToYoutube(
                post.userId, title, contentText, mediaList[0].type === 'REEL' ? 'SHORTS' : 'VIDEO', mediaList[0].url
            );
            externalId = result.videoId ?? 'unknown_id';
        }
        else if (platformEntry.platform === 'twitter') {
            const account = await this.getAccount(post.userId, 'twitter');
            this.logger.log(`🐦 Posting to Twitter...`);

            const storagePaths = mediaList.map((m: any) => m.storagePath).filter(Boolean);

            const result = await this.twitterService.postTweetWithUserToken(
                contentText,
                storagePaths, 
                account.accessToken
            );
            externalId = result.tweetId;
        }
        
        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { status: 'PUBLISHED', externalId: externalId },
        });

      } catch (error: any) { // ✅ Fixed catch variable type
        const detailedError = this.formatPlatformError(platformEntry.platform, error);
    
        this.logger.error(`❌ FAILURE DETECTED: ${detailedError}`);

        await this.prisma.postPlatform.update({
            where: { id: platformEntry.id },
            data: { status: 'FAILED', errorMessage: detailedError }, 
        });

        hasFailures = true;
      }
    }

    // ---------------------------------------------------------
    // 🧹 CLEANUP SECTION
    // ---------------------------------------------------------

    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { 
         platforms: true,
         mediaItems: { include: { media: true } }
      },
    });

    // ✅ FIX 4: Explicit null check for updatedPost
    if (!updatedPost) {
        if (hasFailures) throw new Error('Some platforms failed to publish. Job will retry.');
        return;
    }

    const allSuccess = updatedPost.platforms.every(p => p.status === 'PUBLISHED');
    const anyFailed = updatedPost.platforms.some(p => p.status === 'FAILED');

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: allSuccess ? 'PUBLISHED' : (anyFailed ? 'PARTIAL' : 'PUBLISHED') },
    });

    // ✅ FIX 5: Cast to any[] to fix the 'length' and Iterator errors on 'never' type
    const updatedMediaItems = (updatedPost as any).mediaItems || [];

    if (allSuccess && updatedMediaItems.length > 0) {
      this.logger.log(`✨ All platforms success. Deleting media files from Cloud...`);
      
      for (const item of updatedMediaItems) {
          if (item.media?.storagePath) {
              try {
                  await this.storageService.deleteFile(item.media.storagePath);
              } catch (err: any) { 
                  // ✅ FIX 6: Added ': any' to 'err'
                  this.logger.warn(`Failed to delete ${item.media.storagePath}: ${err.message}`);
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
      where: { userId, provider },
    });
    if (!account) throw new Error(`${provider} account not connected`);
    return account;
  }
}
