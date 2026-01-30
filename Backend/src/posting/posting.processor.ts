import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// Platform Services
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

  @Process('publish-post')
  async handlePublish(job: Job<{ postId: number }>) {
    const { postId } = job.data;
    this.logger.log(`🚀 Processing Job for Post #${postId}`);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { platforms: true, media: true },
    });

    if (!post) {
      this.logger.error(`Post #${postId} not found`);
      return;
    }

    const contentText = post.content || '';
    let mediaUrl = post.media?.fileUrl || '';

    // Generate Signed URL if necessary
    if (post.media?.storagePath) {
      try {
        // Uncomment if using private bucket
        mediaUrl = await this.storageService.getSignedReadUrl(post.media.storagePath);
        this.logger.log(`🔑 Signed URL Generated: ${mediaUrl}`);
      } catch (e) {
        this.logger.warn(`Could not sign URL: ${e.message}`);
      }
    }

    // Tracker for failures
    let hasFailures = false;

    // 2. Loop through selected platforms
    for (const platformEntry of post.platforms) {
      // ✅ SKIP if already published
      if (platformEntry.status === 'PUBLISHED') continue;

      try {
        let externalId = '';
        this.logger.log(`📤 Posting to ${platformEntry.platform}...`);

        if (platformEntry.platform === 'facebook') {
            if (!mediaUrl) throw new Error('Media URL is required for Facebook');
            const pageId = (post.contentMetadata as any)?.platformOverrides?.facebook?.pageId;
            if (!pageId) throw new Error('Facebook Page ID missing');

            const result = await this.facebookService.postToFacebook(
                post.userId, pageId, contentText, mediaUrl, post.media?.type as any
            );
            externalId = result.postId || 'fb_id';
        } 
       else if (platformEntry.platform === 'instagram') {
            if (!mediaUrl) throw new Error('Media URL is required for Instagram');
            const account = await this.getAccount(post.userId, 'instagram');
            const instaMeta = (post.contentMetadata as any)?.platformOverrides?.instagram;
            const userPostType = instaMeta?.postType || 'post'; // 'post', 'reel', 'story'

            let apiMediaType: 'IMAGE' | 'REELS' | 'STORIES' = 'IMAGE';

            if (userPostType === 'story') {
                apiMediaType = 'STORIES';
            } else if (userPostType === 'reel') {
                apiMediaType = 'REELS';
            } else {
                // If 'post' (Feed), check if it's actually a video file.
                // Instagram Business API requires Videos to be sent as REELS mostly.
                if (post.media?.type === 'VIDEO') {
                    apiMediaType = 'REELS';
                } else {
                    apiMediaType = 'IMAGE';
                }
            }

            // 3. Call Service
            // Note: account.providerId MUST be the Instagram Business Account ID
            const result = await this.instagramBusinessService.publishContent(
                account.providerId, 
                account.accessToken, 
                apiMediaType, 
                mediaUrl, 
                contentText
            );
            externalId = result.id;
        }
        else if (platformEntry.platform === 'linkedin') {
            const account = await this.getAccount(post.userId, 'linkedin');
            const result = await this.linkedinService.postToLinkedIn(
                account.accessToken, account.providerId, contentText,
                post.media ? { url: mediaUrl, type: post.media.type as 'IMAGE' | 'VIDEO' } : undefined
            );
            externalId = result.postId;
        } 
       else if (platformEntry.platform === 'threads') {
            const account = await this.getAccount(post.userId, 'threads');
            
            // ✅ Determine type safely from Post Media
            // Note: Your schema uses 'IMAGE', 'VIDEO', 'REEL'
            const type = (post.media?.type === 'VIDEO' || post.media?.type === 'REEL') 
              ? 'VIDEO' 
              : 'IMAGE';

            const result = await this.threadsService.postToThreads(
                account.accessToken, 
                contentText, 
                mediaUrl || undefined, 
                type // 👈 Pass the type here
            );
            externalId = result.postId;
        }
        
        else if (platformEntry.platform === 'youtube') {
            if (!mediaUrl) throw new Error('Video file is required for YouTube');
            const title = (post.contentMetadata as any)?.title || 'New Video';
            const result = await this.youtubeService.uploadVideoToYoutube(
                post.userId, title, contentText, post.media?.type === 'REEL' ? 'SHORTS' : 'VIDEO', mediaUrl
            );
            externalId = result.videoId ?? 'unknown_id';
        }
        else if (platformEntry.platform === 'twitter') {
            const account = await this.getAccount(post.userId, 'twitter');
            this.logger.log(`🐦 Posting to Twitter...`);

            // ✅ Pass storagePath (not the signed URL) because the updated 
            // TwitterService handles the GCS download/signing internally.
            const result = await this.twitterService.postTweetWithUserToken(
                contentText,
                post.media?.storagePath, 
                account.accessToken
            );
            externalId = result.tweetId;
        }
        // ✅ Success Update
        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { status: 'PUBLISHED', externalId: externalId },
        });

      } catch (error) {
        let detailedError = error.message;

    // Check if the error comes from an HTTP request (Axios/Fetch)
    if (error.response) {
        // Facebook / Instagram / Threads usually put details here:
        if (error.response.data?.error?.message) {
            detailedError = `[${platformEntry.platform}] API Error: ${error.response.data.error.message}`;
        }
        // YouTube / Google usually puts details here:
        else if (error.response.data?.error?.errors?.[0]?.message) {
            detailedError = `[${platformEntry.platform}] API Error: ${error.response.data.error.errors[0].message}`;
        }
        // LinkedIn sometimes puts details here:
        else if (error.response.data?.message) {
            detailedError = `[${platformEntry.platform}] API Error: ${error.response.data.message}`;
        }
        // Fallback: Just dump the whole data object if we can't find a specific message
        else {
             detailedError = `[${platformEntry.platform}] Raw Error: ${JSON.stringify(error.response.data)}`;
        }
    }
    
    // Log the REAL reason to your console
    this.logger.error(`❌ FAILURE DETECTED: ${detailedError}`);
    // 🔍 END DEBUGGING LOGIC

    // Update Database with the DETAILED error
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

    // Refetch to get latest statuses
    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { platforms: true, media: true },
    });

    // Safe checks using ?.
    const allSuccess = updatedPost?.platforms.every(p => p.status === 'PUBLISHED');
    const anyFailed = updatedPost?.platforms.some(p => p.status === 'FAILED');

    // Update Main Post Status
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: allSuccess ? 'PUBLISHED' : (anyFailed ? 'PARTIAL' : 'PUBLISHED') },
    });

    // Delete file if EVERYTHING succeeded
    if (allSuccess && updatedPost?.media?.storagePath) {
      this.logger.log(`✨ All platforms success. Deleting media...`);
      await this.storageService.deleteFile(updatedPost.media.storagePath);
    }

    // ⚠️ TRIGGER RETRY: If we had failures, throw error now so BullMQ retries later
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