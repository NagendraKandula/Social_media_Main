import { Injectable ,NotFoundException,ForbiddenException} from '@nestjs/common';
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
      content, mediaUrl, storagePath, mimeType, mediaType, 
      platforms, scheduledAt, contentMetadata 
    } = dto;
    
    const isScheduled = !!scheduledAt;

    // 1. Create Media Record
    const media = await this.prisma.media.create({
      data: {
        userId,
        fileUrl: mediaUrl,
        storagePath,
        mimeType,
        type: mediaType, 
      },
    });

    // 2. Create Post Linked to Media
    const post = await this.prisma.post.create({
      data: {
        userId,
        content,
        mediaId: media.id, 
        isScheduled,
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        status: isScheduled ? 'SCHEDULED' : 'PENDING',
        contentMetadata: contentMetadata as any, 
        platforms: {
          create: platforms.map((p) => ({ platform: p, status: 'PENDING' })),
        },
      },
      include: { platforms: true },
    });

    // 3. If "Post Now", add to Queue immediately
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

    // 1. Fetch posts from Prisma (MUST INCLUDE platforms AND media)
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
        platforms: true, // 🔥 CRITICAL: Tells Prisma to fetch the platforms
        media: true      // 🔥 CRITICAL: Tells Prisma to fetch the image URL
      }, 
    });

    // 2. Format response asynchronously to generate Secure Signed URLs
    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        let secureMediaUrl: string | null = null;

        if (post.media && post.media.storagePath) {
          try {
            // Generates the public read link for your frontend
            secureMediaUrl = await this.storageService.getSignedReadUrl(post.media.storagePath);
          } catch (error) {
            secureMediaUrl = post.media.fileUrl; 
          }
        }

        return {
          id: post.id,
          content: post.content,
          scheduledAt: post.scheduledAt || (post as any).createdAt,
          status: post.status,
          
          // 🔥 CRITICAL FIX: Convert the Prisma platform objects into a simple array of strings for React
          platforms: post.platforms.map((p) => p.platform.toLowerCase()), 
          platform: post.platforms.length > 0 ? post.platforms[0].platform.toLowerCase() : 'instagram',
          
          // 🔥 CRITICAL FIX: Actually send the metadata and image back to React!
          contentMetadata: post.contentMetadata, 
          mediaUrl: secureMediaUrl, 
        };
      })
    );

    return formattedPosts;
  }
  // 2. Reschedule a Post (Drag & Drop)
  async reschedulePost(userId: number, postId: number, newScheduledAt: string) {
    // Verify ownership
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');

    // Update the timestamp
    return this.prisma.post.update({
      where: { id: postId },
      data: { scheduledAt: new Date(newScheduledAt) },
    });
  }

  // 3. Update Post Content & Platform (Edit Modal)
 // 3. Update Post Content, Platform & Image (Edit Modal)
  async updatePost(userId: number, postId: number, data: UpdatePostDto) { // Temporarily use 'any' so TypeScript allows the media fields
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
   
    // Check if the frontend sent a NEW image during the edit
    let mediaUpdate = {};
    if (data.mediaUrl) {
      mediaUpdate = {
        media: {
          create: {
            userId,
            fileUrl: data.mediaUrl,
            storagePath: data.storagePath,
            mimeType: data.mimeType,
            type: data.mediaType,
          }
        }
      };
    }

    // 1. Update the main Post text, status, metadata AND potentially the new image
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: data.content,
        status: data.status,
        ...(data.contentMetadata && { contentMetadata: data.contentMetadata as any }), 
        ...mediaUpdate, // <--- This safely links the newly uploaded image to the post!
      },
    });

    // 2. If platforms changed, update the PostPlatform relations
    if (data.platforms && Array.isArray(data.platforms)) {
      // Delete old platforms
      await this.prisma.postPlatform.deleteMany({
        where: { postId: postId },
      });
      // Create new platform links
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

    // Due to 'onDelete: Cascade' in your Prisma schema, deleting the Post 
    // will automatically delete the linked PostPlatform records!
    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}
