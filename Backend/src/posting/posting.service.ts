import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException, 
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StorageService } from '../storage/storage.service';
import { PostStatus, Platform, MediaType, MediaStatus } from '@prisma/client';

const THREADS_MAX_TEXT_LENGTH = 500;

@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('social-posting') private readonly postingQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  // Added this helper so your frontend hook can register media!
 // MUST BE INSIDE PostingService
  async registerMedia(userId: number, gcsPath: string, fileType: MediaType) {
    return this.prisma.media.create({
      data: {
        userId,
        gcsPath,
        fileType,
        status: 'UPLOADED', // From MediaStatus enum
      }
    });
  }

  async createPost(userId: number, dto: CreatePostDto) {
    try {
      const { 
        primaryCaption, 
        mediaSlots = [], 
        platforms = [], 
        scheduledAt 
      } = dto;

      const normalizedPlatforms: Platform[] = platforms.map(
        (p) => (typeof p === 'string' ? p.toUpperCase() : p) as Platform,
      );

      // Filter out invalid slots just in case the frontend sent undefined IDs
      const validMediaSlots = mediaSlots.filter(s => s.mediaId != null);

      if (validMediaSlots.length > 0) {
        const mediaIds = [...new Set(validMediaSlots.map(s => s.mediaId))];
        const mediaRecords = await this.prisma.media.findMany({
          where: { id: { in: mediaIds }, userId },
        });
        const mediaMap = new Map(mediaRecords.map(m => [m.id, m]));

        for (const platform of normalizedPlatforms) {
          const platformSlots = validMediaSlots.filter(s => s.platform === platform);
          let videoCount = 0;
          let imageCount = 0;

          platformSlots.forEach(slot => {
            const media = mediaMap.get(slot.mediaId);
            if (!media) throw new BadRequestException(`Media ID ${slot.mediaId} not found.`);
            if (media.fileType === MediaType.VIDEO) videoCount++;
            if (media.fileType === MediaType.IMAGE) imageCount++;
          });

          // Basic validation checks
          if (platform === Platform.THREADS && (primaryCaption || '').length > THREADS_MAX_TEXT_LENGTH) {
            throw new BadRequestException('Threads text posts are limited to 500 characters.');
          }
          if (platform === Platform.YOUTUBE && imageCount > 0) {
            throw new BadRequestException('YouTube does not support images.');
          }
        }
      }

      const isScheduled = !!scheduledAt;
      const initialStatus = isScheduled ? PostStatus.SCHEDULED : PostStatus.PENDING;

      const post = await this.prisma.post.create({
        data: {
          userId,
          primaryCaption,
          scheduledAt: isScheduled ? new Date(scheduledAt) : null,
          status: initialStatus,
          platforms: {
            create: normalizedPlatforms.map((p) => ({ 
              platform: p, 
              status: PostStatus.PENDING 
            })),
          },
          mediaSlots: {
            create: validMediaSlots.map((slot) => ({
              mediaId: slot.mediaId,
              platform: slot.platform,
              position: slot.position,
              editId: slot.editId || null
            }))
          }
        },
        include: { platforms: true },
      });

      if (!isScheduled) {
        await this.postingQueue.add('publish-post', { postId: post.id });
      }

      return post;
    } catch (error: any) {
      this.logger.error(`Failed to create post: ${error.message}`, error.stack);
      throw error; // Will return the 500 or 400 back to the frontend
    }
  }

  async getScheduledPosts(userId: number, offset: number) {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (offset * 7));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const posts = await this.prisma.post.findMany({
        where: {
          userId,
          OR: [
            { scheduledAt: { gte: startOfWeek, lt: endOfWeek } },
            { scheduledAt: null, createdAt: { gte: startOfWeek, lt: endOfWeek } }
          ]
        },
        include: { 
          platforms: true, 
          mediaSlots: { 
            include: { media: true },
            orderBy: { position: 'asc' } 
          } 
        }, 
      });
const formattedPosts = await Promise.all(
  posts.map(async (post) => {
    const isPublished = post.status === PostStatus.PUBLISHED;

    let secureMediaItems: any[] = [];

    // Only generate previews for posts whose media still exists in GCS
    if (!isPublished) {
      secureMediaItems = await Promise.all(
        post.mediaSlots.map(async (slot) => {
          let url: string | null = null;

          if (slot.media.gcsPath) {
            try {
              url = await this.storageService.getSignedReadUrl(
                slot.media.gcsPath,
                "application/octet-stream",
              );
            } catch (error: any) {
              this.logger.warn(`Failed to sign URL: ${error.message}`);
            }
          }

          return {
            ...slot.media,
            fileUrl: url,
            secureUrl: url,
            platform: slot.platform,
          };
        }),
      );
    }

    return {
      id: post.id,
      content: post.primaryCaption,
      scheduledAt: post.scheduledAt || post.createdAt,
      status: post.status,

      platforms: post.platforms.map((p) => p.platform.toLowerCase()),

      platformStatuses: post.platforms.map((p) => ({
        platform: p.platform.toLowerCase(),
        status: p.status,
        externalId: p.externalId,
        errorMessage: p.errorMessage,
      })),

      platform:
        post.platforms.length > 0
          ? post.platforms[0].platform.toLowerCase()
          : "instagram",

      // Empty for published posts
      mediaItems: secureMediaItems,
    };
  }),
);

return formattedPosts;
    } catch (error: any) {
      this.logger.error(`Failed to fetch scheduled posts: ${error.message}`, error.stack);
      throw error;
    }
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

  async reschedulePost(userId: number, postId: number, newScheduledAt: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
    if (post.status === PostStatus.PUBLISHED) {
       throw new ForbiddenException('Cannot reschedule a post that is already published.');
    }
    return this.prisma.post.update({
      where: { id: postId },
      data: { 
        scheduledAt: new Date(newScheduledAt),
        status: PostStatus.SCHEDULED
      },
    });
  }

  async updatePost(userId: number, postId: number, data: UpdatePostDto) { 
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
    if (post.status === PostStatus.PUBLISHED || post.status === PostStatus.FAILED) {
       throw new ForbiddenException(`Cannot edit a post that is already ${post.status.toLowerCase()}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.mediaSlots) {
        await tx.postMediaSlot.deleteMany({ where: { postId } });
      }

      if (data.platforms) {
        await tx.postPlatform.deleteMany({ where: { postId } });
      }

      const normalizedUpdatePlatforms: Platform[] = data.platforms 
        ? data.platforms.map((p: string) => p.toUpperCase() as Platform)
        : [];

      return tx.post.update({
        where: { id: postId },
        data: {
          primaryCaption: data.primaryCaption,
          status: data.status,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          ...(data.platforms && {
            platforms: {
              create: normalizedUpdatePlatforms.map((platform) => ({
                platform: platform,
                status: PostStatus.PENDING,
              })),
            }
          }),
          ...(data.mediaSlots && {
            mediaSlots: {
              create: data.mediaSlots.map((slot) => ({
                mediaId: slot.mediaId,
                platform: slot.platform,
                position: slot.position,
                editId: slot.editId || null
              }))
            }
          })
        },
      });
    });
  }

  async deletePost(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Access denied');
    if (post.status === PostStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot delete a post that is already published.');
    }
    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}