import { Injectable ,NotFoundException,ForbiddenException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PostStatus } from '@prisma/client';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('social-posting') private readonly postingQueue: Queue,
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
    // Calculate the start (Sunday) and end (Saturday) of the requested week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Fetch posts within this date range
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        // CHANGE THIS: Use the 'in' operator to fetch multiple statuses
        status: {
          in: ['SCHEDULED', 'PUBLISHED', 'PENDING', 'FAILED'] 
        },
        scheduledAt: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
      },
      include: { platforms: true }, 
    });

    // Format the response to match what the frontend expects
    return posts.map(post => ({
      id: post.id,
      content: post.content,
      scheduledAt: post.scheduledAt,
      status: post.status,
      // Safely grab the first platform (since the UI edit modal currently supports 1 platform)
      platform: post.platforms.length > 0 ? post.platforms[0].platform : 'instagram',
    }));
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
  async updatePost(userId: number, postId: number, data: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
   
    // 1. Update the main Post text and status
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: data.content,
        // Because we use UpdatePostDto, TypeScript knows this is safely formatted!
        status: data.status, 
      },
    });

    // 2. If platform changed, update the PostPlatform relations
    if (data.platform) {
      // Delete old platforms
      await this.prisma.postPlatform.deleteMany({
        where: { postId: postId },
      });
      // Create new platform link
      await this.prisma.postPlatform.create({
        data: {
          postId: postId,
          platform: data.platform,
          status: 'PENDING',
        },
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
