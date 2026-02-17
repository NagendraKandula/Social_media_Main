import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
}