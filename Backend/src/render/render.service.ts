import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaType } from '@prisma/client';
import sharp from 'sharp';

interface RenderResult {
  variants: number;
  reused: number;
  generated: number;
}

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * ------------------------------------------------------------
   * Check whether frontend supplied a crop.
   *
   * IMPORTANT:
   *
   * These values are considered FINAL/NATIVE IMAGE coordinates.
   *
   * Example:
   *
   * cropX      = 1348
   * cropY      = 0
   * cropWidth  = 1541
   * cropHeight = 1926
   *
   * Sharp will use EXACTLY these values.
   * ------------------------------------------------------------
   */
  private hasCropEdit(edit: any): boolean {
    return (
      edit.cropX != null &&
      edit.cropY != null &&
      edit.cropWidth != null &&
      edit.cropHeight != null &&
      Number(edit.cropWidth) > 0 &&
      Number(edit.cropHeight) > 0
    );
  }

  /**
   * ------------------------------------------------------------
   * Check rotation.
   *
   * Rotation is kept separate from crop.
   * ------------------------------------------------------------
   */
  private hasRotationEdit(edit: any): boolean {
    return (
      edit.rotation != null &&
      Number(edit.rotation) !== 0
    );
  }

  /**
   * ------------------------------------------------------------
   * Process render job.
   *
   * MAIN RULE:
   *
   * Frontend tells us:
   *
   *   cropX
   *   cropY
   *   cropWidth
   *   cropHeight
   *
   * Backend simply cuts that exact rectangle.
   *
   * NO platform resizing.
   * NO platform aspect-ratio calculation.
   * NO "cover" resizing.
   * ------------------------------------------------------------
   */
  async processRenderJob(
    postId: number,
  ): Promise<RenderResult> {
    this.logger.log(
      `⚙️ Starting render pipeline for Post #${postId}`,
    );

    const result: RenderResult = {
      variants: 0,
      reused: 0,
      generated: 0,
    };

    // ============================================================
    // 1. LOAD POST
    // ============================================================

    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },

      include: {
        platforms: true,

        mediaSlots: {
          include: {
            media: true,
            edit: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error(
        `Post #${postId} not found`,
      );
    }

    this.logger.log(
      `📦 Post #${postId} loaded`,
    );

    this.logger.log(
      `📊 Platforms=${post.platforms.length} | ` +
        `MediaSlots=${post.mediaSlots.length}`,
    );

    // ============================================================
    // 2. VALIDATE MEDIA
    // ============================================================

    if (!post.mediaSlots.length) {
      throw new Error(
        `No media slots found for Post #${postId}`,
      );
    }

    // ============================================================
    // 3. DATABASE OPERATIONS
    // ============================================================

    const dbOperations: ReturnType<
      typeof this.prisma.mediaVariant.upsert
    >[] = [];

    // ============================================================
    // 4. PROCESS EACH PLATFORM
    // ============================================================

    for (const postPlatform of post.platforms) {
      const platform = postPlatform.platform;

      this.logger.log(
        `\n================================================`,
      );

      this.logger.log(
        `🚀 Processing platform: ${platform}`,
      );

      this.logger.log(
        `================================================`,
      );

      // ------------------------------------------------------------
      // Get ONLY slots belonging to this platform.
      //
      // This is important because:
      //
      // Facebook Media 83
      // Instagram Media 83
      // Threads Media 83
      //
      // can all have different edits.
      // ------------------------------------------------------------

      const platformSlots = post.mediaSlots
        .filter(
          (slot) =>
            slot.platform === platform,
        )
        .sort(
          (a, b) =>
            a.position - b.position,
        );

      this.logger.log(
        `🖼 [${platform}] Found ${platformSlots.length} media slots`,
      );

      if (!platformSlots.length) {
        this.logger.warn(
          `⚠️ No media slots found for ${platform}`,
        );

        continue;
      }

      // ==========================================================
      // 5. PROCESS EACH MEDIA SLOT
      // ==========================================================

      for (const slot of platformSlots) {
        // --------------------------------------------------------
        // Validate media
        // --------------------------------------------------------

        if (!slot.media) {
          this.logger.warn(
            `⚠️ [${platform}] Position ${slot.position} ` +
              `has no media. Skipping.`,
          );

          continue;
        }

        if (!slot.edit) {
          this.logger.warn(
            `⚠️ [${platform}] Media ${slot.media.id} ` +
              `has no edit configuration. Skipping.`,
          );

          continue;
        }

        const media = slot.media;
        const edit = slot.edit;

        result.variants++;

        // --------------------------------------------------------
        // Log slot
        // --------------------------------------------------------

        this.logger.log(
          `\n------------------------------------------------`,
        );

        this.logger.log(
          `🎯 Processing Media Slot`,
        );

        this.logger.log(
          `Post       : ${postId}`,
        );

        this.logger.log(
          `Platform   : ${platform}`,
        );

        this.logger.log(
          `Position   : ${slot.position}`,
        );

        this.logger.log(
          `MediaId    : ${media.id}`,
        );

        this.logger.log(
          `EditId     : ${edit.id}`,
        );

        this.logger.log(
          `EditVersion: ${edit.version}`,
        );

        this.logger.log(
          `GCS Path   : ${media.gcsPath}`,
        );

        this.logger.log(
          `Placement  : ${edit.placement}`,
        );

        this.logger.log(
          `------------------------------------------------`,
        );

        // ========================================================
        // 6. VIDEO
        // ========================================================

        if (
          media.fileType ===
          MediaType.VIDEO
        ) {
          this.logger.log(
            `🎥 [VIDEO-BYPASS] ` +
              `Post #${postId} | ` +
              `Platform=${platform} | ` +
              `Position=${slot.position} | ` +
              `MediaId=${media.id}`,
          );

          if (!media.gcsPath) {
            throw new Error(
              `Video GCS path missing for Media #${media.id}`,
            );
          }

          result.reused++;

          dbOperations.push(
            this.prisma.mediaVariant.upsert({
              where: {
                editId_editVersion: {
                  editId: edit.id,
                  editVersion: edit.version,
                },
              },

              update: {
                gcsPath: media.gcsPath,
                cdnUrl: '',
                width: media.width ?? 0,
                height: media.height ?? 0,
                status: 'READY',
              },

              create: {
                editId: edit.id,
                editVersion: edit.version,
                gcsPath: media.gcsPath,
                cdnUrl: '',
                width: media.width ?? 0,
                height: media.height ?? 0,
                status: 'READY',
              },
            }),
          );

          continue;
        }

        // ========================================================
        // 7. IMAGE PATH VALIDATION
        // ========================================================

        if (!media.gcsPath) {
          throw new Error(
            `Original media path missing for Media #${media.id}`,
          );
        }

        // ========================================================
        // 8. DOWNLOAD ORIGINAL IMAGE
        // ========================================================

        this.logger.log(
          `📥 [${platform}] Downloading Media #${media.id}`,
        );

        this.logger.log(
          `📂 Source: ${media.gcsPath}`,
        );

        const originalBuffer =
          await this.storageService.downloadFile(
            media.gcsPath,
          );

        this.logger.log(
          `✅ [${platform}] Downloaded Media #${media.id} ` +
            `(${originalBuffer.length} bytes)`,
        );

        // ========================================================
        // 9. READ ACTUAL IMAGE METADATA
        // ========================================================

        const metadata =
          await sharp(
            originalBuffer,
          ).metadata();

        const actualWidth =
          metadata.width ?? 0;

        const actualHeight =
          metadata.height ?? 0;

        if (
          actualWidth <= 0 ||
          actualHeight <= 0
        ) {
          throw new Error(
            `Unable to determine actual image dimensions ` +
              `for Media #${media.id}`,
          );
        }

        this.logger.log(
          `📐 [IMAGE] Media #${media.id} ` +
            `Actual=${actualWidth}x${actualHeight}`,
        );

        // ========================================================
        // 10. READ FRONTEND EDIT
        // ========================================================

        const hasCrop =
          this.hasCropEdit(edit);

        const hasRotation =
          this.hasRotationEdit(edit);

        this.logger.log(
          `🎨 [EDIT] Media #${media.id} | ` +
            `Crop=${hasCrop ? 'YES' : 'NO'} | ` +
            `Rotation=${hasRotation ? 'YES' : 'NO'}`,
        );

        this.logger.log(
          `
================================================
FRONTEND EDIT RECEIVED
================================================
Post        : ${postId}
Platform    : ${platform}
Position    : ${slot.position}
MediaId     : ${media.id}
EditId      : ${edit.id}
EditVersion : ${edit.version}

Original    : ${actualWidth}x${actualHeight}

cropX       : ${edit.cropX}
cropY       : ${edit.cropY}
cropWidth   : ${edit.cropWidth}
cropHeight  : ${edit.cropHeight}

rotation    : ${edit.rotation ?? 0}

Has Crop    : ${hasCrop}
Has Rotation: ${hasRotation}
================================================
          `,
        );

        // ========================================================
        // 11. DEFAULT RESULT
        // ========================================================

        let finalGcsPath =
          media.gcsPath;

        let finalWidth =
          actualWidth;

        let finalHeight =
          actualHeight;

        let finalMimeType =
          metadata.format
            ? `image/${metadata.format}`
            : 'image/jpeg';

        // ========================================================
        // 12. IMPORTANT RENDER DECISION
        //
        // ONLY USER EDITS DECIDE WHETHER SHARP RUNS.
        //
        // We are NOT checking platform rules here.
        //
        // If frontend sent crop:
        //
        //       Sharp MUST CUT IT.
        //
        // If frontend sent rotation:
        //
        //       Sharp MUST APPLY IT.
        //
        // Otherwise:
        //
        //       Original image can be reused.
        // ========================================================

        const needsRendering =
          hasCrop ||
          hasRotation;

        if (!needsRendering) {
          result.reused++;

          this.logger.log(
            `♻️ [REUSE] ` +
              `Media #${media.id} has no crop or rotation.`,
          );
        }

        // ========================================================
        // 13. SHARP RENDER
        // ========================================================

        if (needsRendering) {
          result.generated++;

          this.logger.log(
            `🎨 [SHARP] Rendering Media #${media.id}`,
          );

          // ------------------------------------------------------
          // VERY IMPORTANT:
          //
          // Start with the ORIGINAL IMAGE.
          //
          // Do NOT resize first.
          // Do NOT calculate platform dimensions.
          // Do NOT use fit: cover.
          // ------------------------------------------------------

          let sharpInstance =
            sharp(originalBuffer);

          // ======================================================
          // 13A. EXACT FRONTEND CROP
          // ======================================================

          if (hasCrop) {
            const cropX = Math.round(
              Number(edit.cropX),
            );

            const cropY = Math.round(
              Number(edit.cropY),
            );

            const cropWidth = Math.round(
              Number(edit.cropWidth),
            );

            const cropHeight = Math.round(
              Number(edit.cropHeight),
            );

            this.logger.log(
              `
✂️ [SHARP EXACT CROP]

MediaId     : ${media.id}
Platform    : ${platform}

Original    : ${actualWidth}x${actualHeight}

Frontend:
cropX       = ${cropX}
cropY       = ${cropY}
cropWidth   = ${cropWidth}
cropHeight  = ${cropHeight}

Sharp:
left        = ${cropX}
top         = ${cropY}
width       = ${cropWidth}
height      = ${cropHeight}
              `,
            );

            // ----------------------------------------------------
            // Validate X
            // ----------------------------------------------------

            if (
              cropX < 0 ||
              cropX >= actualWidth
            ) {
              throw new Error(
                `[CROP] Invalid cropX=${cropX} ` +
                  `for Media #${media.id}. ` +
                  `Original width=${actualWidth}`,
              );
            }

            // ----------------------------------------------------
            // Validate Y
            // ----------------------------------------------------

            if (
              cropY < 0 ||
              cropY >= actualHeight
            ) {
              throw new Error(
                `[CROP] Invalid cropY=${cropY} ` +
                  `for Media #${media.id}. ` +
                  `Original height=${actualHeight}`,
              );
            }

            // ----------------------------------------------------
            // Validate width
            // ----------------------------------------------------

            if (cropWidth <= 0) {
              throw new Error(
                `[CROP] Invalid cropWidth=${cropWidth} ` +
                  `for Media #${media.id}`,
              );
            }

            // ----------------------------------------------------
            // Validate height
            // ----------------------------------------------------

            if (cropHeight <= 0) {
              throw new Error(
                `[CROP] Invalid cropHeight=${cropHeight} ` +
                  `for Media #${media.id}`,
              );
            }

            // ----------------------------------------------------
            // IMPORTANT:
            //
            // We do NOT silently change the user's crop.
            //
            // If frontend says:
            //
            // x=1348
            // y=0
            // w=1541
            // h=1926
            //
            // then Sharp receives exactly:
            //
            // left=1348
            // top=0
            // width=1541
            // height=1926
            //
            // If the rectangle doesn't fit inside the image,
            // throw an error instead of silently modifying it.
            // ----------------------------------------------------

            if (
              cropX + cropWidth >
              actualWidth
            ) {
              throw new Error(
                `[CROP] Crop exceeds image width for Media #${media.id}. ` +
                  `cropX(${cropX}) + cropWidth(${cropWidth}) = ` +
                  `${cropX + cropWidth}, ` +
                  `imageWidth=${actualWidth}`,
              );
            }

            if (
              cropY + cropHeight >
              actualHeight
            ) {
              throw new Error(
                `[CROP] Crop exceeds image height for Media #${media.id}. ` +
                  `cropY(${cropY}) + cropHeight(${cropHeight}) = ` +
                  `${cropY + cropHeight}, ` +
                  `imageHeight=${actualHeight}`,
              );
            }

            // ----------------------------------------------------
            // EXACT CUT
            // ----------------------------------------------------

            sharpInstance =
              sharpInstance.extract({
                left: cropX,
                top: cropY,
                width: cropWidth,
                height: cropHeight,
              });

            // The image after the crop has exactly these dimensions.
            finalWidth =
              cropWidth;

            finalHeight =
              cropHeight;

            this.logger.log(
              `✅ [SHARP] Exact crop applied: ` +
                `${cropWidth}x${cropHeight}`,
            );
          }

          // ======================================================
          // 13B. ROTATION
          // ======================================================

          if (hasRotation) {
            const rotation =
              Number(edit.rotation);

            this.logger.log(
              `🔄 [SHARP] Applying rotation ` +
                `${rotation}° to Media #${media.id}`,
            );

            sharpInstance =
              sharpInstance.rotate(
                rotation,
              );
          }

          // ======================================================
          // 13C. OUTPUT
          //
          // IMPORTANT:
          //
          // NO resize.
          //
          // NO fit.
          //
          // NO platform dimensions.
          //
          // The output is exactly the crop.
          // ======================================================

          const processedBuffer =
            await sharpInstance
              .jpeg({
                quality: 90,
              })
              .toBuffer();

          this.logger.log(
            `✅ [SHARP] Processed Media #${media.id} ` +
              `(${processedBuffer.length} bytes)`,
          );

          // ------------------------------------------------------
          // Verify actual output dimensions.
          // ------------------------------------------------------

          const outputMetadata =
            await sharp(
              processedBuffer,
            ).metadata();

          finalWidth =
            outputMetadata.width ??
            finalWidth;

          finalHeight =
            outputMetadata.height ??
            finalHeight;

          finalMimeType =
            'image/jpeg';

          this.logger.log(
            `📐 [SHARP OUTPUT] ` +
              `Media #${media.id} -> ` +
              `${finalWidth}x${finalHeight}`,
          );

          // ======================================================
          // 13D. UNIQUE GCS VARIANT PATH
          // ======================================================

          const fileName =
            `variants/post-${postId}/` +
            `${platform.toLowerCase()}/` +
            `media-${media.id}-edit-${edit.id}-v${edit.version}.jpg`;

          this.logger.log(
            `📤 [GCS] Uploading variant`,
          );

          this.logger.log(
            `📂 Destination: ${fileName}`,
          );

          finalGcsPath =
            await this.storageService.uploadFile(
              processedBuffer,
              fileName,
              finalMimeType,
            );

          this.logger.log(
            `✅ [GCS] Uploaded variant: ` +
              `${finalGcsPath}`,
          );
        }

        // ========================================================
        // 14. UPSERT MEDIA VARIANT
        // ========================================================

        const variantData = {
          gcsPath:
            finalGcsPath,

          cdnUrl:
            '',

          width:
            finalWidth,

          height:
            finalHeight,

          status:
            'READY' as const,
        };

        dbOperations.push(
          this.prisma.mediaVariant.upsert({
            where: {
              editId_editVersion: {
                editId:
                  edit.id,

                editVersion:
                  edit.version,
              },
            },

            update:
              variantData,

            create: {
              editId:
                edit.id,

              editVersion:
                edit.version,

              ...variantData,
            },
          }),
        );

        this.logger.log(
          `
💾 [VARIANT READY]

Post        : ${postId}
Platform    : ${platform}
Position    : ${slot.position}
MediaId     : ${media.id}
EditId      : ${edit.id}
Version     : ${edit.version}

Final GCS   : ${finalGcsPath}
Final Size  : ${finalWidth}x${finalHeight}
Status      : READY
          `,
        );
      }
    }

    // ============================================================
    // 15. COMMIT ALL VARIANTS
    // ============================================================

    if (dbOperations.length > 0) {
      this.logger.log(
        `💾 Saving ${dbOperations.length} media variants...`,
      );

      await this.prisma.$transaction(
        dbOperations,
      );

      this.logger.log(
        `✅ Successfully committed ` +
          `${dbOperations.length} variants to database.`,
      );
    }

    // ============================================================
    // 16. FINAL SUMMARY
    // ============================================================

    this.logger.log(
      `
================================================
✅ RENDER COMPLETED
================================================

Post       : #${postId}

Variants   : ${result.variants}
Generated  : ${result.generated}
Reused     : ${result.reused}
DB Writes  : ${dbOperations.length}

================================================
      `,
    );

    return result;
  }
}
