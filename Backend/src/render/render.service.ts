import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RenderHelper } from './render.helper';
import { PLATFORM_IMAGE_RULES } from './config/platformrules';
import {
  Placement,
  MediaType,
} from '@prisma/client';
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
    private readonly renderHelper: RenderHelper,
  ) {}

  /**
   * Convert Prisma placement into the placement
   * expected by PLATFORM_IMAGE_RULES.
   */
  private mapPlacement(
    placement: Placement,
  ): 'feed' | 'story' {
    switch (placement) {
      case Placement.FEED:
      case Placement.CAROUSEL:
        return 'feed';

      case Placement.STORY:
      case Placement.REEL:
      case Placement.SHORT:
        return 'story';

      default:
        return 'feed';
    }
  }

  /**
   * Determines whether the edit actually changes the image.
   *
   * IMPORTANT:
   *
   * cropWidth/cropHeight are EDIT METADATA.
   *
   * They do NOT mean that the GCS image has already been cropped.
   *
   * Therefore, whenever crop information exists, Sharp MUST run.
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
   * Determines whether rotation requires Sharp.
   */
  private hasRotationEdit(edit: any): boolean {
    return (
      edit.rotation != null &&
      Number(edit.rotation) !== 0
    );
  }

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
    // 1. LOAD POST + ALL MEDIA SLOTS
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
    // 2. VALIDATE MEDIA SLOTS
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
    // 4. PROCESS EVERY PLATFORM
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

      /**
       * IMPORTANT:
       *
       * One platform can have multiple media slots.
       *
       * Example:
       *
       * INSTAGRAM
       *   position 0 -> media 73
       *   position 1 -> media 71
       *   position 2 -> media 72
       *
       * Therefore we MUST process every slot.
       */
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
      // 5. PROCESS EVERY MEDIA SLOT
      // ==========================================================

      for (const slot of platformSlots) {
        // --------------------------------------------------------
        // Validate slot
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

        const mappedPlacement =
          this.mapPlacement(
            edit.placement,
          );

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
          `GCS Path   : ${media.gcsPath}`,
        );

        this.logger.log(
          `Placement  : ${mappedPlacement}`,
        );

        this.logger.log(
          `------------------------------------------------`,
        );

        // ========================================================
        // 6. VIDEO BYPASS
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
              `Video GCS path missing for ` +
                `Media #${media.id}`,
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
        // 7. VALIDATE IMAGE GCS PATH
        // ========================================================

        if (!media.gcsPath) {
          throw new Error(
            `Original media path missing for ` +
              `Media #${media.id}`,
          );
        }

        // ========================================================
        // 8. DOWNLOAD THIS MEDIA
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

        const resolvedWidth =
          media.width ??
          metadata.width ??
          0;

        const resolvedHeight =
          media.height ??
          metadata.height ??
          0;

        const fileSizeBytes =
          media.fileSizeBytes ??
          originalBuffer.length;

        const originalMimeType =
          metadata.format
            ? `image/${metadata.format}`
            : 'image/jpeg';

        if (
          resolvedWidth <= 0 ||
          resolvedHeight <= 0
        ) {
          throw new Error(
            `Unable to determine dimensions for ` +
              `Media #${media.id}`,
          );
        }

        this.logger.log(
          `📐 [${platform}] Media #${media.id} ` +
            `Original=${resolvedWidth}x${resolvedHeight}`,
        );

        // ========================================================
        // 10. DETECT USER EDITS
        // ========================================================

        const hasCrop =
          this.hasCropEdit(edit);

        const hasRotation =
          this.hasRotationEdit(edit);

        this.logger.log(
          `🎨 [EDIT-DETECTION] ` +
            `Media #${media.id} | ` +
            `Crop=${hasCrop ? 'YES' : 'NO'} | ` +
            `Rotation=${hasRotation ? 'YES' : 'NO'}`,
        );

        // ========================================================
        // 11. PLATFORM COMPLIANCE CHECK
        //
        // IMPORTANT FIX:
        //
        // DO NOT use cropWidth/cropHeight here.
        //
        // Those values describe what the user WANTS to crop.
        //
        // The actual GCS image is still resolvedWidth x
        // resolvedHeight until Sharp executes.
        // ========================================================

        const platformDecision =
          this.renderHelper.needsRendering(
            platform,
            mappedPlacement,
            resolvedWidth,
            resolvedHeight,
            fileSizeBytes,
          );

        // ========================================================
        // 12. FINAL RENDER DECISION
        //
        // Sharp is required when:
        //
        // 1. User cropped the image
        // 2. User rotated the image
        // 3. Platform requirements are not satisfied
        //
        // This is the main fix.
        // ========================================================

        const needsRendering =
          hasCrop ||
          hasRotation ||
          platformDecision.needsRendering;

        let renderReason = '';

        if (hasCrop) {
          renderReason =
            'User crop edit requires Sharp rendering.';
        } else if (hasRotation) {
          renderReason =
            'User rotation edit requires Sharp rendering.';
        } else if (
          platformDecision.needsRendering
        ) {
          renderReason =
            platformDecision.reason;
        } else {
          renderReason =
            'Original image is platform compliant and has no image edit.';
        }

        this.logger.log(`
------------------------------------------------
Post        : ${postId}
Platform    : ${platform}
Position    : ${slot.position}
MediaId     : ${media.id}
EditId      : ${edit.id}
Placement   : ${mappedPlacement}

Original    : ${resolvedWidth}x${resolvedHeight}

Crop        : ${
          edit.cropX ?? 'none'
        },${
          edit.cropY ?? 'none'
        } ${
          edit.cropWidth ?? 'none'
        }x${
          edit.cropHeight ?? 'none'
        }

Rotation    : ${edit.rotation ?? 0}

Platform Need Sharp : ${
          platformDecision.needsRendering
            ? 'YES'
            : 'NO'
        }

User Edit Need Sharp : ${
          hasCrop || hasRotation
            ? 'YES'
            : 'NO'
        }

Need Sharp  : ${
          needsRendering
            ? 'YES'
            : 'NO'
        }

Reason
------
${renderReason}
------------------------------------------------
        `);

        // ========================================================
        // 13. DEFAULT = ORIGINAL MEDIA
        // ========================================================

        let finalGcsPath =
          media.gcsPath;

        let finalWidth =
          resolvedWidth;

        let finalHeight =
          resolvedHeight;

        let finalMimeType =
          originalMimeType;

        // ========================================================
        // 14. RENDER WITH SHARP
        // ========================================================

        if (needsRendering) {
          result.generated++;

          const platformRules =
            PLATFORM_IMAGE_RULES[
              platform
            ];

          if (!platformRules) {
            throw new Error(
              `No image rules configured for ` +
                `platform ${platform}`,
            );
          }

          const placementRules =
            platformRules[
              mappedPlacement
            ];

          if (!placementRules) {
            throw new Error(
              `No image rules configured for ` +
                `${platform}/${mappedPlacement}`,
            );
          }

          const targetRules =
            placementRules.recommended;

          this.logger.log(
            `🎨 [SHARP] Rendering Media #${media.id}`,
          );

          this.logger.log(
            `🎯 [SHARP] Target=${targetRules.width}x${targetRules.height}`,
          );

          // ------------------------------------------------------
          // Create Sharp instance from THIS MEDIA
          // ------------------------------------------------------

          let sharpInstance =
            sharp(originalBuffer);

          // ------------------------------------------------------
          // 14A. APPLY CROP
          // ------------------------------------------------------

          if (hasCrop) {
            let cropX =
              Math.round(
                Number(edit.cropX),
              );

            let cropY =
              Math.round(
                Number(edit.cropY),
              );

            let cropWidth =
              Math.round(
                Number(edit.cropWidth),
              );

            let cropHeight =
              Math.round(
                Number(edit.cropHeight),
              );

            // ----------------------------------------------------
            // Prevent negative coordinates
            // ----------------------------------------------------

            cropX =
              Math.max(
                0,
                cropX,
              );

            cropY =
              Math.max(
                0,
                cropY,
              );

            // ----------------------------------------------------
            // Clamp crop position to image
            // ----------------------------------------------------

            if (cropX >= resolvedWidth) {
              throw new Error(
                `Invalid cropX=${cropX} for Media #${media.id}. ` +
                  `Image width=${resolvedWidth}`,
              );
            }

            if (cropY >= resolvedHeight) {
              throw new Error(
                `Invalid cropY=${cropY} for Media #${media.id}. ` +
                  `Image height=${resolvedHeight}`,
              );
            }

            // ----------------------------------------------------
            // Clamp crop dimensions
            // ----------------------------------------------------

            cropWidth =
              Math.min(
                cropWidth,
                resolvedWidth - cropX,
              );

            cropHeight =
              Math.min(
                cropHeight,
                resolvedHeight - cropY,
              );

            if (
              cropWidth <= 0 ||
              cropHeight <= 0
            ) {
              throw new Error(
                `Invalid crop dimensions for Media #${media.id}: ` +
                  `${cropWidth}x${cropHeight}`,
              );
            }

            this.logger.log(
              `✂️ [SHARP] Crop Media #${media.id}: ` +
                `x=${cropX}, ` +
                `y=${cropY}, ` +
                `w=${cropWidth}, ` +
                `h=${cropHeight}`,
            );

            sharpInstance =
              sharpInstance.extract({
                left: cropX,
                top: cropY,
                width: cropWidth,
                height: cropHeight,
              });

            // ----------------------------------------------------
            // Update effective dimensions after crop
            // ----------------------------------------------------

            finalWidth =
              cropWidth;

            finalHeight =
              cropHeight;
          }

          // ======================================================
          // 14B. APPLY ROTATION
          // ======================================================

          if (hasRotation) {
            const rotation =
              Number(edit.rotation);

            this.logger.log(
              `🔄 [SHARP] Rotation Media #${media.id}: ` +
                `${rotation}°`,
            );

            sharpInstance =
              sharpInstance.rotate(
                rotation,
              );
          }

          // ======================================================
          // 14C. RESIZE TO PLATFORM TARGET
          // ======================================================

          this.logger.log(
            `📐 [SHARP] Resizing Media #${media.id} ` +
              `to ${targetRules.width}x${targetRules.height}`,
          );

          const processedBuffer =
            await sharpInstance
              .resize({
                width:
                  targetRules.width,
                height:
                  targetRules.height,
                fit: 'cover',
                position: 'center',
              })
              .jpeg({
                quality: 90,
              })
              .toBuffer();

          this.logger.log(
            `✅ [SHARP] Rendered Media #${media.id} ` +
              `(${processedBuffer.length} bytes)`,
          );

          // ======================================================
          // 14D. FINAL DIMENSIONS
          // ======================================================

          finalWidth =
            targetRules.width;

          finalHeight =
            targetRules.height;

          finalMimeType =
            'image/jpeg';

          // ======================================================
          // 14E. UNIQUE VARIANT PATH
          // ======================================================

          /**
           * Include:
           *
           * postId
           * platform
           * mediaId
           * edit version
           *
           * This prevents different media from overwriting
           * each other's variants.
           */

          const fileName =
            `variants/post-${postId}/` +
            `${platform.toLowerCase()}/` +
            `media-${media.id}-v${edit.version}.jpg`;

          this.logger.log(
            `📤 [GCS] Uploading Media #${media.id}`,
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
            `✅ [GCS] Uploaded Media #${media.id}: ` +
              `${finalGcsPath}`,
          );
        } else {
          // ======================================================
          // 15. REUSE ORIGINAL
          // ======================================================

          result.reused++;

          this.logger.log(
            `♻️ [REUSE] Media #${media.id} ` +
              `does not require rendering.`,
          );
        }

        // ========================================================
        // 16. UPSERT MEDIA VARIANT
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
                editId: edit.id,
                editVersion: edit.version,
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
          `💾 [VARIANT] Prepared DB record ` +
            `Media #${media.id} | ` +
            `Edit #${edit.id} | ` +
            `Version=${edit.version} | ` +
            `Path=${finalGcsPath}`,
        );
      }
    }

    // ============================================================
    // 17. COMMIT ALL VARIANTS
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
    // 18. FINAL SUMMARY
    // ============================================================

    this.logger.log(`
================================================
✅ Render completed for Post #${postId}

Variants : ${result.variants}
Generated: ${result.generated}
Reused   : ${result.reused}
DB Writes: ${dbOperations.length}
================================================
    `);

    return result;
  }
}