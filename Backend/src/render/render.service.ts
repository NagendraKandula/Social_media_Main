import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RenderHelper } from './render.helper';
import { PLATFORM_IMAGE_RULES } from './config/platformrules';
import { Placement, Platform,MediaType } from '@prisma/client';
import sharp from 'sharp';

// Change these two lines at the top of render.service.ts:


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

  private mapPlacement(placement: Placement): 'feed' | 'story' {
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

  async processRenderJob(postId: number): Promise<RenderResult> {
    this.logger.log(`⚙️ Starting render pipeline for Post #${postId}`);

    const result: RenderResult = { variants: 0, reused: 0, generated: 0 };

    //----------------------------------------
    // 1. Load Post & Deep Relations
    //----------------------------------------
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
      throw new Error(`Post ${postId} not found`);
    }

    const slotMap = new Map(post.mediaSlots.map((slot) => [slot.platform, slot]));

    const firstSlot = post.mediaSlots[0];
    if (!firstSlot || !firstSlot.media) {
      throw new Error(`Media not found for Post ${postId}`);
    }

    //----------------------------------------
    // 2. Validate GCS Path & Download ONCE
    //----------------------------------------
    if (!firstSlot.media.gcsPath) {
      throw new Error(`Original media path missing for Post #${postId}`);
    }

    this.logger.log(`📥 Downloading original media from GCS: ${firstSlot.media.gcsPath}`);
    const originalBuffer = await this.storageService.downloadFile(firstSlot.media.gcsPath);

    //----------------------------------------
    // 3. Smart Metadata Resolution
    //----------------------------------------
    let resolvedWidth: number;
    let resolvedHeight: number;

    if (firstSlot.media.width && firstSlot.media.height) {
      resolvedWidth = firstSlot.media.width;
      resolvedHeight = firstSlot.media.height;
    } else {
      this.logger.log(`⚠️ Dimensions missing in DB. Analyzing via Sharp...`);
      const metadata = await sharp(originalBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error(`Unable to determine image dimensions for Post #${postId}`);
      }

      resolvedWidth = metadata.width;
      resolvedHeight = metadata.height;
    }


    // Rely on native generated types (no 'as any')
    const fileSizeBytes = firstSlot.media.fileSizeBytes || originalBuffer.length;
    // Assuming you added 'mimeType' to your Prisma Media model and ran 'npx prisma generate'
    const originalMimeType =  'image/jpeg';

    // Type the array safely based on the return type of the Prisma upsert function
    const dbOperations: ReturnType<typeof this.prisma.mediaVariant.upsert>[] = [];

    //----------------------------------------
    // 4. Loop Platforms
    //----------------------------------------
    for (const postPlatform of post.platforms) {
      const platform = postPlatform.platform;
      const slot = slotMap.get(platform);

      if (!slot || !slot.media || !slot.edit) {
        this.logger.warn(`⚠️ Incomplete media/edit instructions for ${platform}. Skipping.`);
        continue;
      }

      result.variants++;
      const media = slot.media;
      const edit = slot.edit;
      const mappedPlacement = this.mapPlacement(edit.placement);
       if (media.fileType === MediaType.VIDEO) {
    this.logger.log(
      `🎥 [VIDEO-BYPASS] Post #${postId} | ` +
      `Platform=${platform} | MediaId=${media.id} | ` +
      `Using original video`,
    );

    result.variants++;
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
          gcsPath: media.gcsPath!,
          cdnUrl: '',
          width: media.width ?? 0,
          height: media.height ?? 0,
          status: 'READY',
        },
        create: {
          editId: edit.id,
          editVersion: edit.version,
          gcsPath: media.gcsPath!,
          cdnUrl: '',
          width: media.width ?? 0,
          height: media.height ?? 0,
          status: 'READY',
        },
      }),
    );

    continue;
  }

      //----------------------------------------
      // 5. Helper Decision
      //----------------------------------------
      const effectiveWidth =
  edit.cropWidth != null && edit.cropWidth > 0
    ? Math.round(edit.cropWidth)
    : resolvedWidth;

const effectiveHeight =
  edit.cropHeight != null && edit.cropHeight > 0
    ? Math.round(edit.cropHeight)
    : resolvedHeight;

const effectiveAspectRatio = effectiveWidth / effectiveHeight;

this.logger.log(
  `📐 [RENDER-DIMENSIONS] ` +
  `Original=${resolvedWidth}x${resolvedHeight} | ` +
  `Crop=${edit.cropWidth ?? 'none'}x${edit.cropHeight ?? 'none'} | ` +
  `Effective=${effectiveWidth}x${effectiveHeight} | ` +
  `AspectRatio=${effectiveAspectRatio.toFixed(3)}`
);

      const decision = this.renderHelper.needsRendering(
        platform,
  mappedPlacement,
  effectiveWidth,
  effectiveHeight,
  fileSizeBytes,
      );

      // Structured Logging
      this.logger.log(`
      ----------------------------------------
      Post        : ${postId}
      Platform    : ${platform}
      Placement   : ${mappedPlacement}
      MediaId     : ${media.id}
      EditId      : ${edit.id}

      Need Sharp  : ${decision.needsRendering ? 'YES' : 'NO'}

      Reason
      -------
      ${decision.reason}
      ----------------------------------------
      `);

      let finalGcsPath = media.gcsPath!;
      let finalWidth = resolvedWidth;
      let finalHeight = resolvedHeight;
      let finalMimeType = originalMimeType;

      //----------------------------------------
      // 6. Process if Not Compatible
      //----------------------------------------
      if (decision.needsRendering) {
        result.generated++;
        const targetRules = PLATFORM_IMAGE_RULES[platform][mappedPlacement].recommended;
        let sharpInstance = sharp(originalBuffer);

        if (edit.cropWidth && edit.cropHeight && edit.cropX != null && edit.cropY != null) {
          sharpInstance = sharpInstance.extract({
            left: Math.round(edit.cropX),
            top: Math.round(edit.cropY),
            width: Math.round(edit.cropWidth),
            height: Math.round(edit.cropHeight),
          });
        }

        const processedBuffer = await sharpInstance
          .resize({
            width: targetRules.width,
            height: targetRules.height,
            fit: 'cover',
            position: 'center',
          })
          .toFormat('jpeg', { quality: 90 })
          .toBuffer();

        finalWidth = targetRules.width;
        finalHeight = targetRules.height;
        finalMimeType = 'image/jpeg';

        // Clean folder structure: variants/post-10/instagram-v1.jpg
        const fileName = `variants/post-${postId}/${platform.toLowerCase()}-v${edit.version}.jpg`;
        
        finalGcsPath = await this.storageService.uploadFile(
          processedBuffer,
          fileName,
          finalMimeType,
        );
      } else {
        result.reused++;
      }

      //----------------------------------------
      // 7. Prepare MediaVariant Upsert
      //----------------------------------------
      const variantData = {
        gcsPath: finalGcsPath,
        cdnUrl: '',
        width: finalWidth,
        height: finalHeight,
        status: 'READY' as const,
        // mimeType: finalMimeType, // Uncomment when added to MediaVariant schema
      };

      dbOperations.push(
        this.prisma.mediaVariant.upsert({
          where: {
            editId_editVersion: {
              editId: edit.id,
              editVersion: edit.version,
            },
          },
          update: variantData,
          create: {
            editId: edit.id,
            editVersion: edit.version,
            ...variantData,
          },
        }),
      );
    }

    //----------------------------------------
    // 8. Execute Database Transaction
    //----------------------------------------
    if (dbOperations.length > 0) {
      await this.prisma.$transaction(dbOperations);
      this.logger.log(`💾 Successfully committed ${dbOperations.length} variants to database.`);
    }

    return result;
  }
}