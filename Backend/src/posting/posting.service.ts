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
import { PostStatus, Platform, MediaType, MediaStatus,Placement } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { MediaEditDto } from './dto/media-edit.dto';

const THREADS_MAX_TEXT_LENGTH = 500;

@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('render-queue') private readonly renderQueue: Queue,
    private readonly storageService: StorageService,
  ) {}
 
  // Added this helper so your frontend hook can register media!
 // MUST BE INSIDE PostingService
  async registerMedia(userId: number, gcsPath: string, fileType: MediaType) {
    this.logger.log(
    `🔵 [REGISTER-MEDIA:1] Service entered | userId=${userId} | gcsPath=${gcsPath} | fileType=${fileType}`,
  );

  this.logger.log(
    `🔵 [REGISTER-MEDIA:2] About to execute prisma.media.create()`,
  );
  try{
    const media = await this.prisma.media.create({
      data: {
        userId,
        gcsPath,
        fileType,
        status: 'UPLOADED', // From MediaStatus enum
      }
    });
       this.logger.log(
      `🟢 [REGISTER-MEDIA:3] Prisma media.create() completed | mediaId=${media.id}`,
    );

    this.logger.log(
      `🟢 [REGISTER-MEDIA:4] Returning media response`,
    );

    return media;
  }
  catch (error: any) {
    this.logger.error(
      `🔴 [REGISTER-MEDIA:ERROR] ${error.message}`,
      error.stack,
    );

    throw error;
  }
  }
  private async saveMediaEdit(
  tx: Prisma.TransactionClient,
  mediaId: number,
  edit: MediaEditDto,
) {
  this.logger.log(
    `🟡 [MEDIA-EDIT:1] upsert started | mediaId=${mediaId} | platform=${edit.platform} | placement=${edit.placement}`,
  );

  try {
    const result = await tx.mediaEdit.upsert({
      where: {
        mediaId_platform_placement: {
          mediaId,
          platform: edit.platform,
          placement: edit.placement,
        },
      },
      update: {
        cropX: edit.cropX,
        cropY: edit.cropY,
        cropWidth: edit.cropWidth,
        cropHeight: edit.cropHeight,
        rotation: edit.rotation,
        focalX: edit.focalX,
        focalY: edit.focalY,
        version: { increment: 1 },
      },
      create: {
        mediaId,
        platform: edit.platform,
        placement: edit.placement,
        cropX: edit.cropX,
        cropY: edit.cropY,
        cropWidth: edit.cropWidth,
        cropHeight: edit.cropHeight,
        rotation: edit.rotation,
        focalX: edit.focalX,
        focalY: edit.focalY,
      },
    });

    this.logger.log(
      `🟢 [MEDIA-EDIT:2] upsert completed | editId=${result.id}`,
    );

    return result;
  } catch (error: any) {
    this.logger.error(
      `🔴 [MEDIA-EDIT:ERROR] ${error.message}`,
      error.stack,
    );
    throw error;
  }
}
  async createPost(userId: number, dto: CreatePostDto) {
    this.logger.log(
    `🚀 [CREATE-POST:1] Service entered | userId=${userId}`,
  );
    try {
      const { 
        primaryCaption, 
        mediaSlots = [], 
        platforms = [], 
        scheduledAt,
        contentMetadata,
      } = dto;
       this.logger.log(
      `🚀 [CREATE-POST:2] DTO received`,
    );

    this.logger.log(
      `Platforms: ${JSON.stringify(platforms)}`,
    );

    this.logger.log(
      `MediaSlots: ${JSON.stringify(mediaSlots)}`,
    );

    this.logger.log(
      `ScheduledAt: ${scheduledAt}`,
    );
      const normalizedPlatforms: Platform[] = platforms.map(
        (p) => (typeof p === 'string' ? p.toUpperCase() : p) as Platform,
      );

      const validMediaSlots = mediaSlots.filter(s => s.mediaId != null);
      this.logger.log(
  `🚀 [CREATE-POST:3] Valid media slots=${validMediaSlots.length}`,
);

      if (validMediaSlots.length > 0) {
        const mediaIds = [...new Set(validMediaSlots.map(s => s.mediaId))];
        this.logger.log(
  `➡️ [CREATE-POST:4] Before media.findMany()`,
);
        const mediaRecords = await this.prisma.media.findMany({
          where: { id: { in: mediaIds }, userId },
        });
        this.logger.log(
  `🟢 [CREATE-POST:5] media.findMany() completed | count=${mediaRecords.length}`,
);
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

      // ATOMIC TRANSACTION: Edits -> Post -> Platforms -> Slots
      this.logger.log(
  `➡️ [CREATE-POST:6] Starting Prisma transaction`,
);

      const post = await this.prisma.$transaction(async (tx) => {

  this.logger.log(
    `🟣 [TRANSACTION:1] Transaction started`,
  );

  const processedSlots: {
    mediaId: number;
    platform: Platform;
    position: number;
    editId: number | null;
  }[] = [];

  for (const slot of validMediaSlots) {

    this.logger.log(
      `🟣 [TRANSACTION:2] Processing mediaSlot | mediaId=${slot.mediaId} | platform=${slot.platform} | position=${slot.position}`,
    );

    let editData: MediaEditDto;

    if (slot.edit) {

      this.logger.log(
        `🟢 [TRANSACTION:3] Frontend edit data received`,
      );

      editData = slot.edit;

    } else {

      this.logger.log(
        `➡️ [TRANSACTION:3] No edit data | Fetching media`,
      );

      const media = await tx.media.findUnique({
        where: {
          id: slot.mediaId,
        },
      });

      this.logger.log(
        `🟢 [TRANSACTION:4] tx.media.findUnique() completed | mediaId=${slot.mediaId}`,
      );

      if (!media) {
        throw new BadRequestException(
          `Media ID ${slot.mediaId} not found`,
        );
      }

      editData = {
        platform: slot.platform as Platform,
        placement: Placement.FEED,
        cropX: 0,
        cropY: 0,
        cropWidth: media.width || 1080,
        cropHeight: media.height || 1080,
        rotation: 0,
      };
    }

    this.logger.log(
      `➡️ [TRANSACTION:5] Before saveMediaEdit() | mediaId=${slot.mediaId}`,
    );

    const editRecord = await this.saveMediaEdit(
      tx,
      slot.mediaId,
      editData,
    );

    this.logger.log(
      `🟢 [TRANSACTION:6] saveMediaEdit() completed | editId=${editRecord.id}`,
    );

    processedSlots.push({
      mediaId: slot.mediaId,
      platform: slot.platform as Platform,
      position: slot.position,
      editId: editRecord.id,
    });

    this.logger.log(
      `🟢 [TRANSACTION:7] processedSlots.push() completed | count=${processedSlots.length}`,
    );
  }

  // IMPORTANT: outside the loop
  this.logger.log(
    `➡️ [TRANSACTION:8] About to execute tx.post.create() | slots=${processedSlots.length} | platforms=${normalizedPlatforms.length}`,
  );

  const createdPost = await tx.post.create({
    data: {
      userId,
      primaryCaption,
      scheduledAt: isScheduled
        ? new Date(scheduledAt)
        : null,
      status: initialStatus,
      contentMetadata: contentMetadata || undefined,

      platforms: {
        create: normalizedPlatforms.map((p) => ({
          platform: p,
          status: PostStatus.PENDING,
        })),
      },

      mediaSlots: {
        create: processedSlots,
      },
    },

    include: {
      platforms: true,
    },
  });

  this.logger.log(
    `🟢 [TRANSACTION:9] tx.post.create() completed | postId=${createdPost.id}`,
  );

  return createdPost;
});
this.logger.log(
  `🟢 [CREATE-POST:7] Transaction completed | postId=${post.id}`,
);

if (!isScheduled) {
  this.logger.log(
    `➡️ [CREATE-POST:8] Adding job to render-queue | postId=${post.id}`,
  );

  const job = await this.renderQueue.add(
    'process-media',
    {
      postId: post.id,
    },
  );

  this.logger.log(
    `🟢 [CREATE-POST:9] render-queue job added | jobId=${job.id}`,
  );
}

this.logger.log(
  `🟢 [CREATE-POST:10] createPost() returning | postId=${post.id}`,
);

return post;
    } catch (error: any) {
      this.logger.error(`Failed to create post: ${error.message}`, error.stack);
      throw error; 
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