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
  async registerMedia(userId: number, gcsPath: string, fileType: MediaType, width?: number, height?: number, durationMs?: number, fileSizeBytes?: number) {
    this.logger.log(
    `🔵 [REGISTER-MEDIA:1] Service entered | userId=${userId} | gcsPath=${gcsPath} | fileType=${fileType}`,
  );

  this.logger.log(
    `🔵 [REGISTER-MEDIA:2] Metadata | width=${width} | height=${height} | durationMs=${durationMs} | fileSizeBytes=${fileSizeBytes}`,
  );
  try{
    const media = await this.prisma.media.create({
      data: {
        userId,
        gcsPath,
        fileType,
        status: 'UPLOADED',
        width,
       height,
      durationMs,
      fileSizeBytes, // From MediaStatus enum
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
    startOfWeek.setDate(
      now.getDate() - now.getDay() + offset * 7,
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    this.logger.log(
      `📅 [SCHEDULED] Fetching posts | userId=${userId} | offset=${offset}`,
    );

    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        OR: [
          {
            scheduledAt: {
              gte: startOfWeek,
              lt: endOfWeek,
            },
          },
          {
            scheduledAt: null,
            createdAt: {
              gte: startOfWeek,
              lt: endOfWeek,
            },
          },
        ],
      },

      include: {
        platforms: true,

        mediaSlots: {
          include: {
            media: true,

            // ⭐ IMPORTANT
            // Load the saved crop/edit information
            edit: true,
          },

          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    this.logger.log(
      `🟢 [SCHEDULED] Found ${posts.length} posts`,
    );

    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        const isPublished =
          post.status === PostStatus.PUBLISHED;

        let secureMediaSlots: any[] = [];

        /*
         * Published posts:
         * media may already be deleted from GCS.
         *
         * Scheduled / pending posts:
         * generate signed URLs so frontend can preview them.
         */
        if (!isPublished) {
          secureMediaSlots = await Promise.all(
            post.mediaSlots.map(async (slot) => {
              let url: string | null = null;

              if (slot.media?.gcsPath) {
                try {
                  url =
                    await this.storageService.getSignedReadUrl(
                      slot.media.gcsPath,
                      'application/octet-stream',
                    );
                } catch (error: any) {
                  this.logger.warn(
                    `[SCHEDULED] Failed to sign media URL | mediaId=${slot.mediaId} | error=${error.message}`,
                  );
                }
              }

              return {
                mediaId: slot.mediaId,

                platform: slot.platform.toLowerCase(),

                position: slot.position,

                /*
                 * Original media information
                 */
                media: slot.media
                  ? {
                      ...slot.media,
                      fileUrl: url,
                      secureUrl: url,
                    }
                  : null,

                /*
                 * ⭐ SAVED CROP INFORMATION
                 *
                 * This is what the old getScheduledPosts()
                 * was missing.
                 */
                edit: slot.edit
                  ? {
                      id: slot.edit.id,

                      mediaId: slot.edit.mediaId,

                      platform: slot.edit.platform,

                      placement: slot.edit.placement,

                      cropX: slot.edit.cropX,
                      cropY: slot.edit.cropY,

                      cropWidth: slot.edit.cropWidth,
                      cropHeight: slot.edit.cropHeight,

                      rotation: slot.edit.rotation,

                      focalX: slot.edit.focalX,
                      focalY: slot.edit.focalY,

                      version: slot.edit.version,
                    }
                  : null,
              };
            }),
          );
        }

        /*
         * Return the exact structure that the Planning page
         * can use.
         */
        return {
          id: post.id,

          content: post.primaryCaption,

          scheduledAt:
            post.scheduledAt || post.createdAt,

          status: post.status,

          /*
           * All selected platforms
           */
          platforms: post.platforms.map(
            (p) => p.platform.toLowerCase(),
          ),

          /*
           * Platform-specific status
           */
          platformStatuses: post.platforms.map((p) => ({
            platform: p.platform.toLowerCase(),

            status: p.status,

            externalId: p.externalId,

            errorMessage: p.errorMessage,
          })),

          /*
           * Backward-compatible single platform field
           */
          platform:
            post.platforms.length > 0
              ? post.platforms[0].platform.toLowerCase()
              : 'instagram',

          /*
           * ⭐ Keep platform override information
           */
          contentMetadata: post.contentMetadata,

          /*
           * ⭐ NEW STRUCTURE
           *
           * This contains:
           * media
           * crop/edit
           * platform
           * position
           */
          mediaSlots: secureMediaSlots,

          /*
           * ⭐ BACKWARD COMPATIBILITY
           *
           * If your current Planning page still reads
           * mediaItems, it will continue working.
           *
           * But now mediaItems ALSO contains edit.
           */
          mediaItems: secureMediaSlots.map((slot) => ({
            ...(slot.media || {}),

            mediaId: slot.mediaId,

            platform: slot.platform,

            position: slot.position,

            edit: slot.edit,
          })),
        };
      }),
    );

    this.logger.log(
      `🟢 [SCHEDULED] Returning ${formattedPosts.length} formatted posts`,
    );

    return formattedPosts;
  } catch (error: any) {
    this.logger.error(
      `🔴 [SCHEDULED] Failed to fetch scheduled posts: ${error.message}`,
      error.stack,
    );

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

  async updatePost(
  userId: number,
  postId: number,
  data: UpdatePostDto,
) {
  this.logger.log(
    `🚀 [UPDATE-POST] Starting update | userId=${userId} | postId=${postId}`,
  );

  /*
   * 1. Verify post exists
   */
  const post = await this.prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new NotFoundException(
      'Post not found',
    );
  }

  /*
   * 2. Verify ownership
   */
  if (post.userId !== userId) {
    throw new ForbiddenException(
      'Access denied',
    );
  }

  /*
   * 3. Do not allow modification of completed posts
   */
  if (
    post.status === PostStatus.PUBLISHED ||
    post.status === PostStatus.FAILED
  ) {
    throw new ForbiddenException(
      `Cannot edit a post that is already ${post.status.toLowerCase()}.`,
    );
  }

  const updatedPost =
    await this.prisma.$transaction(async (tx) => {
      /*
       * =====================================================
       * PLATFORM UPDATE
       * =====================================================
       */

      if (data.platforms) {
        this.logger.log(
          `🟡 [UPDATE-POST] Replacing platforms`,
        );

        await tx.postPlatform.deleteMany({
          where: {
            postId,
          },
        });
      }

      const normalizedPlatforms: Platform[] =
        data.platforms
          ? data.platforms.map(
              (platform: string) =>
                platform.toUpperCase() as Platform,
            )
          : [];

      /*
       * =====================================================
       * MEDIA SLOT UPDATE
       * =====================================================
       */

      let processedSlots: {
        postId: number;
        mediaId: number;
        platform: Platform;
        position: number;
        editId: number | null;
      }[] = [];

      if (data.mediaSlots) {
        this.logger.log(
          `🟡 [UPDATE-POST] Replacing ${data.mediaSlots.length} media slots`,
        );

        /*
         * Remove old post -> media relationships.
         *
         * IMPORTANT:
         * We are NOT deleting MediaEdit here.
         *
         * The MediaEdit belongs to the media itself and can
         * still be reused.
         */
        await tx.postMediaSlot.deleteMany({
          where: {
            postId,
          },
        });

        /*
         * Build new slots
         */
        processedSlots = [];

        for (const slot of data.mediaSlots) {
          this.logger.log(
            `🟡 [UPDATE-POST] Processing slot | mediaId=${slot.mediaId} | platform=${slot.platform} | position=${slot.position}`,
          );

          let editRecordId: number | null = null;

          /*
           * =================================================
           * CASE 1:
           * Frontend sends complete crop/edit information
           * =================================================
           */
          if (slot.edit) {
            this.logger.log(
              `🟢 [UPDATE-POST] New edit data received | mediaId=${slot.mediaId}`,
            );

            /*
             * Make sure the edit belongs to the same
             * platform/media being saved.
             *
             * saveMediaEdit() already uses:
             *
             * mediaId + platform + placement
             *
             * as the unique key.
             */
            const editRecord =
              await this.saveMediaEdit(
                tx,
                slot.mediaId,
                slot.edit,
              );

            editRecordId = editRecord.id;

            this.logger.log(
              `🟢 [UPDATE-POST] Edit saved | editId=${editRecordId}`,
            );
          }

          /*
           * =================================================
           * CASE 2:
           * Frontend only sends existing editId
           * =================================================
           */
          else if (
            (slot as any).editId != null
          ) {
            const editId =
              Number((slot as any).editId);

            this.logger.log(
              `🟡 [UPDATE-POST] Existing editId received | editId=${editId}`,
            );

            const existingEdit =
              await tx.mediaEdit.findUnique({
                where: {
                  id: editId,
                },
              });

            /*
             * Security check:
             *
             * editId must actually belong to
             * the mediaId being attached.
             */
            if (
              !existingEdit ||
              existingEdit.mediaId !== slot.mediaId
            ) {
              throw new BadRequestException(
                'Invalid media edit reference',
              );
            }

            editRecordId =
              existingEdit.id;

            this.logger.log(
              `🟢 [UPDATE-POST] Existing edit validated | editId=${editRecordId}`,
            );
          }

          /*
           * =================================================
           * CASE 3:
           * No edit supplied
           *
           * This is allowed.
           * The slot will simply have no editId.
           * =================================================
           */

          processedSlots.push({
            postId,

            mediaId: slot.mediaId,

            platform:
              (
                typeof slot.platform ===
                'string'
                  ? slot.platform.toUpperCase()
                  : slot.platform
              ) as Platform,

            position: slot.position,

            editId: editRecordId,
          });
        }

        /*
         * Insert all new slots
         */
        if (processedSlots.length > 0) {
          await tx.postMediaSlot.createMany({
            data: processedSlots,
          });

          this.logger.log(
            `🟢 [UPDATE-POST] Created ${processedSlots.length} media slots`,
          );
        }
      }

      /*
       * =====================================================
       * UPDATE POST
       * =====================================================
       */

      const updated =
        await tx.post.update({
          where: {
            id: postId,
          },

          data: {
            /*
             * Caption
             */
            primaryCaption:
              data.primaryCaption,

            /*
             * Status
             */
            status: data.status,

            /*
             * Scheduled time
             */
            scheduledAt:
              data.scheduledAt
                ? new Date(data.scheduledAt)
                : undefined,
            ...(data.platforms && {
              platforms: {
                create:
                  normalizedPlatforms.map(
                    (platform) => ({
                      platform,

                      status:
                        PostStatus.PENDING,
                    }),
                  ),
              },
            }),
          },

          /*
           * Return updated post with relations.
           *
           * This is useful for debugging and confirms
           * the update actually contains the expected
           * relationships.
           */
          include: {
            platforms: true,

            mediaSlots: {
              include: {
                media: true,
                edit: true,
              },

              orderBy: {
                position: 'asc',
              },
            },
          },
        });

      return updated;
    });
/*
 * =====================================================
 * RENDER QUEUE
 * =====================================================
 *
 * Scheduled posts:
 *   - Do NOT render during every edit.
 *   - Keep the latest crop/edit in DB.
 *   - Scheduler/render process will render it when due.
 *
 * Immediate posts:
 *   - Render immediately after update.
 */

const shouldRenderImmediately =
  updatedPost.status !== PostStatus.SCHEDULED &&
  !updatedPost.scheduledAt;

if (shouldRenderImmediately) {
  const job = await this.renderQueue.add(
    'process-media',
    {
      postId: updatedPost.id,
    },
  );

  this.logger.log(
    `🟢 [UPDATE-POST] render-queue job added | jobId=${job.id} | postId=${updatedPost.id}`,
  );
} else {
  this.logger.log(
    `⏰ [UPDATE-POST] Scheduled post updated | postId=${updatedPost.id} | render deferred until scheduled time`,
  );
}

return updatedPost;
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