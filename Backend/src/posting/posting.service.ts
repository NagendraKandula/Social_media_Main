import { Injectable, NotFoundException, ForbiddenException,BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StorageService } from '../storage/storage.service';
import { PostStatus } from '@prisma/client';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('social-posting') private readonly postingQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  async createPost(userId: number, dto: CreatePostDto) {
    const { 
      content, 
      mediaItems = [], 
      platforms = [], // ✅ FIX 2: Default to empty array to prevent undefined error
      scheduledAt, 
      contentMetadata 
    } = dto;
    const totalMedia = mediaItems.length;
    
    // Count videos (including Reels/Stories which are technically video files)
    const videoCount = mediaItems.filter(m => 
        m.mediaType === 'VIDEO' || m.mediaType === 'REEL' || m.mediaType === 'STORY' || (m.mimeType && m.mimeType.startsWith('video/'))
    ).length;
    
    const imageCount = totalMedia - videoCount;
    const isMixedMedia = videoCount > 0 && imageCount > 0;

    if (totalMedia > 0) {
      for (const platform of platforms) {
        switch (platform) {
          
          case 'youtube':
            if (imageCount > 0) {
              throw new BadRequestException('YouTube does not support images. Please upload only 1 video.');
            }
            if (videoCount > 1) {
              throw new BadRequestException('YouTube only supports uploading 1 video at a time.');
            }
            break;

          case 'facebook':
            if (isMixedMedia) {
              throw new BadRequestException('Facebook does not support mixing images and videos in a single post.');
            }
            if (videoCount > 1) {
              throw new BadRequestException('Facebook only supports 1 video per standard post.');
            }
            break;

          case 'linkedin':
            if (isMixedMedia) {
              throw new BadRequestException('LinkedIn does not support mixing images and videos in a single gallery.');
            }
            if (imageCount > 9) {
              throw new BadRequestException('LinkedIn supports a maximum of 9 images in a gallery.');
            }
            if (videoCount > 1) {
              throw new BadRequestException('LinkedIn only supports 1 video per post.');
            }
            break;

          case 'twitter':
            if (totalMedia > 4) {
              throw new BadRequestException('Twitter restricts posts to a maximum of 4 media items.');
            }
            // Note on Twitter API: While the UI sometimes makes it look like you can mix, 
            // the actual Twitter API v2 strictly forbids attaching a video and an image to the same Tweet ID.
            if (isMixedMedia) {
              throw new BadRequestException('Twitter API does not allow mixing images and videos in the same tweet.');
            }
            if (videoCount > 1) {
              throw new BadRequestException('Twitter only supports 1 video per tweet.');
            }
            break;

          case 'instagram':
            if (totalMedia > 10) {
              throw new BadRequestException('Instagram carousels support a maximum of 10 media items.');
            }
            // Add 'as any' and explicitly look inside 'platformOverrides'
            const igPostType = (contentMetadata as any)?.platformOverrides?.instagram?.postType;
            if (igPostType === 'STORY' && totalMedia > 1) {
              throw new BadRequestException('Instagram Stories do not support multiple media items in a single request.');
            }
            break;
            
          case 'threads':
             if (totalMedia > 10) {
               throw new BadRequestException('Threads carousels support a maximum of 10 media items.');
             }
             break;
        }
      }
    }
    const isScheduled = !!scheduledAt;

    // ✅ FIX 1: Removed the old standalone `this.prisma.media.create` block!
    // It was leftover code trying to use the old `mediaUrl` variables.
    // The nested `mediaItems: { create: ... }` block below handles this perfectly now.

    // 2. Create Post Linked to Media
    const post = await this.prisma.post.create({
      data: {
        userId,
        content,
        isScheduled,
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        status: isScheduled ? 'SCHEDULED' : 'PENDING',
        contentMetadata: contentMetadata as any, 
        platforms: {
          create: platforms.map((p) => ({ platform: p, status: 'PENDING' })),
        },
        // Link multiple media items
        mediaItems: {
          create: mediaItems.map((item, index) => ({
            position: index, // Keeps image order intact
            media: {
              create: {
                userId,
                fileUrl: item.mediaUrl,
                storagePath: item.storagePath,
                mimeType: item.mimeType,
                type: item.mediaType,
              }
            }
          }))
        }
      },
      include: { platforms: true },
    });

    if (!isScheduled) {
        await this.postingQueue.add('publish-post', { postId: post.id });
    }

    return post;
  }

  async getScheduledPosts(userId: number, offset: number) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // 1. Fetch posts from Prisma
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'PUBLISHED', 'PENDING', 'FAILED'] },
        OR: [
          { scheduledAt: { gte: startOfWeek, lt: endOfWeek } },
          { scheduledAt: null, createdAt: { gte: startOfWeek, lt: endOfWeek } }
        ]
      },
      include: { 
        platforms: true, 
        mediaItems: { 
          include: { media: true },
          orderBy: { position: 'asc' } 
        } 
      }, 
    });

    // 2. Format response asynchronously to generate Secure Signed URLs
    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        // ✅ FIX 3: Bypass the 'never' array error while Prisma Client updates
        const postMediaItems = (post as any).mediaItems || [];

        const secureMediaItems = await Promise.all(
          postMediaItems.map(async (item: any) => {
             let url = item.media.fileUrl;
             if (item.media.storagePath) {
               try { url = await this.storageService.getSignedReadUrl(item.media.storagePath); } 
               catch (error) {}
             }
             return { ...item.media, secureUrl: url };
          })
        );

        return {
          id: post.id,
          content: post.content,
          scheduledAt: post.scheduledAt || (post as any).createdAt,
          status: post.status,
          platforms: post.platforms.map((p) => p.platform.toLowerCase()), 
          platform: post.platforms.length > 0 ? post.platforms[0].platform.toLowerCase() : 'instagram',
          contentMetadata: post.contentMetadata, 
          mediaItems: secureMediaItems, 
        };
      })
    );
    return formattedPosts;
  }

  // 2. Reschedule a Post (Drag & Drop)
  async reschedulePost(userId: number, postId: number, newScheduledAt: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.post.update({
      where: { id: postId },
      data: { scheduledAt: new Date(newScheduledAt) },
    });
  }

  // 3. Update Post Content, Platform & Image (Edit Modal)
  async updatePost(userId: number, postId: number, data: UpdatePostDto) { 
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
   
    let mediaUpdate = {};
    
    // ✅ Adapted safely for the new schema
    if ((data as any).mediaUrl) {
      mediaUpdate = {
        mediaItems: {
          create: {
            position: 0, // Fallback position
            media: {
              create: {
                userId,
                fileUrl: (data as any).mediaUrl,
                storagePath: (data as any).storagePath,
                mimeType: (data as any).mimeType,
                type: (data as any).mediaType,
              }
            }
          }
        }
      };
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: data.content,
        status: data.status,
        ...(data.contentMetadata && { contentMetadata: data.contentMetadata as any }), 
        ...mediaUpdate, 
      },
    });

    if (data.platforms && Array.isArray(data.platforms)) {
      await this.prisma.postPlatform.deleteMany({
        where: { postId: postId },
      });
      await this.prisma.postPlatform.createMany({
        data: data.platforms.map((platform: string) => ({
          postId: postId,
          platform: platform,
          status: 'PENDING',
        })),
      });
    }

    return updatedPost;
  }

  // 4. Delete/Cancel a Scheduled Post
  async deletePost(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}