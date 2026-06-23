import { Injectable, NotFoundException, ForbiddenException,BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StorageService } from '../storage/storage.service';
import { PostStatus } from '@prisma/client';
import { UpdatePostDto } from './dto/update-post.dto';

const FACEBOOK_MAX_IMAGE_SIZE_BYTES = 10_000_000;
const FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES = 1_000_000;
const FACEBOOK_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/bmp',
  'image/png',
  'image/gif',
  'image/tiff',
]);
const THREADS_MAX_TEXT_LENGTH = 500;
const THREADS_MAX_IMAGE_SIZE_BYTES = 8_000_000;
const THREADS_MAX_VIDEO_SIZE_BYTES = 1_000_000_000;
const THREADS_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const THREADS_ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);
const LINKEDIN_MAX_IMAGE_SIZE_BYTES = 8_000_000;
const LINKEDIN_MIN_VIDEO_SIZE_BYTES = 75_000;
const LINKEDIN_MAX_VIDEO_SIZE_BYTES = 5_000_000_000;
const LINKEDIN_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);
const LINKEDIN_ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

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

    if (platforms.includes('threads') && (content || '').length > THREADS_MAX_TEXT_LENGTH) {
      throw new BadRequestException('Threads text posts are limited to 500 characters.');
    }

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
            const fbPostType = (contentMetadata as any)?.platformOverrides?.facebook?.postType || 'feed';

            if (fbPostType === 'feed') {
              if (videoCount > 0) {
                throw new BadRequestException('Facebook Feed supports image posts and carousel image posts only.');
              }
            } else if (fbPostType === 'reel') {
              if (totalMedia !== 1 || videoCount !== 1) {
                throw new BadRequestException('Facebook Reel requires exactly one video.');
              }
            } else if (fbPostType === 'story') {
              if (totalMedia !== 1) {
                throw new BadRequestException('Facebook Story requires exactly one image or one video.');
              }
            }

            if (imageCount > 0) {
              const unsupportedImage = mediaItems.find(
                (item) =>
                  item.mimeType?.startsWith('image/') &&
                  !FACEBOOK_ALLOWED_IMAGE_TYPES.has(item.mimeType),
              );
              const oversizedImage = mediaItems.find(
                (item) =>
                  item.mimeType?.startsWith('image/') &&
                  (item as any).size > FACEBOOK_MAX_IMAGE_SIZE_BYTES,
              );
              const oversizedPngImage = mediaItems.find(
                (item) =>
                  item.mimeType === 'image/png' &&
                  (item as any).size > FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES,
              );

              if (unsupportedImage) {
                throw new BadRequestException(
                  'Facebook image uploads support JPEG, BMP, PNG, GIF, and TIFF only.',
                );
              }

              if (oversizedImage) {
                throw new BadRequestException(
                  'Facebook photos must be less than 10 MB. Please compress or replace oversized images before publishing.',
                );
              }

              if (oversizedPngImage) {
                throw new BadRequestException(
                  'Facebook recommends PNG files stay under 1 MB or they may appear pixelated. Please compress or replace oversized PNG files before publishing.',
                );
              }
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
            for (const item of mediaItems) {
              if (item.mimeType?.startsWith('image/')) {
                if (!LINKEDIN_ALLOWED_IMAGE_TYPES.has(item.mimeType)) {
                  throw new BadRequestException('LinkedIn images must be JPG, PNG, or static GIF.');
                }
                if ((item as any).size > LINKEDIN_MAX_IMAGE_SIZE_BYTES) {
                  throw new BadRequestException('LinkedIn images must be 8 MB or smaller.');
                }
              } else if (item.mimeType?.startsWith('video/')) {
                if (!LINKEDIN_ALLOWED_VIDEO_TYPES.has(item.mimeType)) {
                  throw new BadRequestException('LinkedIn videos must be MP4 or WebM.');
                }
                if (
                  (item as any).size < LINKEDIN_MIN_VIDEO_SIZE_BYTES ||
                  (item as any).size > LINKEDIN_MAX_VIDEO_SIZE_BYTES
                ) {
                  throw new BadRequestException('LinkedIn videos must be between 75 KB and 5 GB.');
                }
              }
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
            const igPostType =
              (contentMetadata as any)?.platformOverrides?.instagram?.postType?.toLowerCase() || 'post';

            if (igPostType === 'reel') {
              if (totalMedia !== 1 || videoCount !== 1) {
                throw new BadRequestException('Instagram Reel requires exactly one video and does not allow photos.');
              }
            } else if (igPostType === 'story') {
              if (totalMedia !== 1) {
                throw new BadRequestException('Instagram Story requires exactly one image or one video.');
              }
            } else {
              if (videoCount > 0) {
                throw new BadRequestException('Instagram Post supports images only. Use Reel for a single video.');
              }
              if (imageCount > 10) {
                throw new BadRequestException('Instagram carousel supports a maximum of 10 images.');
              }
            }
            break;
            
          case 'threads':
            if ((content || '').length > THREADS_MAX_TEXT_LENGTH) {
              throw new BadRequestException('Threads text posts are limited to 500 characters.');
            }

            if (totalMedia > 10) {
              throw new BadRequestException('Threads carousels support a maximum of 10 media items.');
            }

            for (const item of mediaItems) {
              if (item.mimeType?.startsWith('image/')) {
                if (!THREADS_ALLOWED_IMAGE_TYPES.has(item.mimeType)) {
                  throw new BadRequestException('Threads images must be JPEG or PNG.');
                }
                if ((item as any).size > THREADS_MAX_IMAGE_SIZE_BYTES) {
                  throw new BadRequestException('Threads images must be 8 MB or smaller.');
                }
              } else if (item.mimeType?.startsWith('video/')) {
                if (!THREADS_ALLOWED_VIDEO_TYPES.has(item.mimeType)) {
                  throw new BadRequestException('Threads videos must be MP4 or MOV.');
                }
                if ((item as any).size > THREADS_MAX_VIDEO_SIZE_BYTES) {
                  throw new BadRequestException('Threads videos must be 1 GB or smaller.');
                }
              }
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
        status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'PENDING', 'FAILED'] },
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
               try { url = await this.storageService.getSignedReadUrl(item.media.storagePath, item.media.mimeType); } 
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
          platformStatuses: post.platforms.map((p) => ({
            platform: p.platform.toLowerCase(),
            status: p.status,
            externalId: p.externalId,
            errorMessage: p.errorMessage,
          })),
          platform: post.platforms.length > 0 ? post.platforms[0].platform.toLowerCase() : 'instagram',
          contentMetadata: post.contentMetadata, 
          mediaItems: secureMediaItems, 
        };
      })
    );
    return formattedPosts;
  }

  async getPostStatus(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        platforms: {
          select: {
            platform: true,
            status: true,
            externalId: true,
            errorMessage: true,
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      id: post.id,
      status: post.status,
      platforms: post.platforms,
    };
  }

  // 2. Reschedule a Post (Drag & Drop)
  async reschedulePost(userId: number, postId: number, newScheduledAt: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
      if (post.status === 'PUBLISHED') {
       throw new ForbiddenException('Cannot reschedule a post that is already published.');
    }
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
    if (post.status === 'PUBLISHED' || post.status === 'FAILED') {
       throw new ForbiddenException(`Cannot edit a post that is already ${post.status.toLowerCase()}.`);
    }

    let mediaUpdate = {};
    
    // ✅ Adapted safely for the new schema
    if (data.mediaItems !== undefined) {
      // 1. Always wipe out the old media links if the frontend sends a media state
      await this.prisma.postMedia.deleteMany({
        where: { postId: postId }
      });
   if (data.mediaItems.length > 0) {
      mediaUpdate = {
        mediaItems: {
          create: data.mediaItems.map((item: any, index: number) => ({
            position: index,
            media: {
              create: {
                userId,
                fileUrl: item.mediaUrl,
                storagePath: item.storagePath,
                mimeType: item.mimeType,
                type: item.mediaType || (item.mimeType?.startsWith("video/") ? "VIDEO" : "IMAGE"),
             }
              }
            }))
          }
        };
      }
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
    if (post.status === 'PUBLISHED') {
      throw new ForbiddenException(
        'Cannot delete a post that is already published.'
      );
  }
    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}
