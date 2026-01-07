import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ✅ Import Services
import { FacebookService } from '../social_media_platforms/facebook/facebook.service';
import { InstagramService } from '../social_media_platforms/instagram/instagram.service';
import { LinkedinService } from '../social_media_platforms/linkedin/linkedin.service';
import { TwitterService } from '../social_media_platforms/twitter/twitter.service';
import { YoutubeService } from '../social_media_platforms/youtube/youtube.service';
import { ThreadsService } from '../social_media_platforms/threads/threads.service';

@Processor('social-posting')
export class PostingProcessor {
  private readonly logger = new Logger(PostingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facebookService: FacebookService,
    private readonly instagramService: InstagramService,
    private readonly linkedinService: LinkedinService,
    private readonly twitterService: TwitterService,
    private readonly youtubeService: YoutubeService,
    private readonly threadsService: ThreadsService,
  ) {}

  @Process('publish-post')
  async handlePublish(job: Job<{ postId: number }>) {
    const { postId } = job.data;
    this.logger.log(`🚀 Processing Job for Post #${postId}`);

    // 1. Fetch Post with Media & Platforms
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { platforms: true, media: true },
    });

    if (!post) {
      this.logger.error(`Post #${postId} not found`);
      return;
    }

    // ✅ SAFE GUARDS: Handle optional fields
    const contentText = post.content || ''; 
    const mediaUrl = post.media?.fileUrl || ''; 
    
    // 2. Loop through selected platforms
    for (const platformEntry of post.platforms) {
      if (platformEntry.status === 'PUBLISHED') continue; 

      try {
        let externalId = '';
        this.logger.log(`📤 Posting to ${platformEntry.platform}...`);

        // --- PLATFORM SWITCHING LOGIC ---
        
        // 📘 FACEBOOK
        if (platformEntry.platform === 'facebook') {
            if (!mediaUrl) throw new Error('Media URL is required for Facebook');
            
            // Extract Page ID from metadata or use a default/first page logic
            const pageId = (post.contentMetadata as any)?.platformOverrides?.facebook?.pageId;
            if (!pageId) throw new Error('Facebook Page ID missing in metadata');

            const result = await this.facebookService.postToFacebook(
                post.userId,
                pageId,
                contentText,
                mediaUrl,
                post.media?.type as any // 'IMAGE' | 'VIDEO' | 'REEL'
            );
            externalId = result.postId || 'fb_id';
        }

        // 📷 INSTAGRAM
        else if (platformEntry.platform === 'instagram') {
            if (!mediaUrl) throw new Error('Media URL is required for Instagram');

            const result = await this.instagramService.postToInstagram(
                post.userId,
                contentText,
                mediaUrl,
                post.media?.type as 'IMAGE' | 'REEL' | 'STORIES'
            );
            externalId = result.postId;
        }

        // 💼 LINKEDIN
        else if (platformEntry.platform === 'linkedin') {
            const account = await this.getAccount(post.userId, 'linkedin');
            
            const result = await this.linkedinService.postToLinkedIn(
                account.accessToken,
                account.providerId,
                contentText,
                post.media ? { url: mediaUrl, type: post.media.type as 'IMAGE'|'VIDEO' } : undefined
            );
            externalId = result.postId;
        }

        // 🧵 THREADS
        else if (platformEntry.platform === 'threads') {
            const account = await this.getAccount(post.userId, 'threads');
            
            // ThreadsService expects (token, content, mediaUrl?)
            // We pass undefined if mediaUrl is empty string
            const result = await this.threadsService.postToThreads(
                account.accessToken,
                contentText,
                mediaUrl || undefined 
            );
            externalId = result.postId;
        }

        // ▶️ YOUTUBE
        else if (platformEntry.platform === 'youtube') {
            if (!mediaUrl) throw new Error('Video file is required for YouTube');

            // Extract Title from metadata or use content as fallback
            const title = (post.contentMetadata as any)?.title || 'New Video';
            
            const result = await this.youtubeService.uploadVideoToYoutube(
                post.userId,
                title,
                contentText, // description
                post.media?.type === 'REEL' ? 'SHORTS' : 'VIDEO',
                mediaUrl
            );
            externalId = result.videoId ?? 'unkown_id';
        }

        // --------------------------------

        // 3. Success Update
        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { status: 'PUBLISHED', externalId: externalId },
        });
        this.logger.log(`✅ Success: ${platformEntry.platform}`);

      } catch (error) {
        this.logger.error(`❌ Failed ${platformEntry.platform}: ${error.message}`);
        
        await this.prisma.postPlatform.update({
          where: { id: platformEntry.id },
          data: { status: 'FAILED', errorMessage: error.message },
        });
        
        // Throwing error makes Bull retry the job automatically
        throw error; 
      }
    }

    // 4. Update Main Post Status
    await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' }
    });
  }

  // Helper to get tokens for services that don't self-fetch
  private async getAccount(userId: number, provider: string) {
    const account = await this.prisma.socialAccount.findFirst({
        where: { userId, provider }
    });
    if (!account) throw new Error(`${provider} account not connected`);
    return account;
  }
}