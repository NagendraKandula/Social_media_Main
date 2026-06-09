import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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