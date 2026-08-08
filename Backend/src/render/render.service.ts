import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RenderHelper } from './render.helper';
import { PLATFORM_IMAGE_RULES } from './config/platformrules';
import { MediaType, Placement } from '@prisma/client';
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
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        mediaSlots: {
          include: {
            media: true,
            edit: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const mediaCache = new Map<
      number,
      { buffer: Buffer; width: number; height: number; fileSizeBytes: number }
    >();

    const loadOriginal = async (media: (typeof post.mediaSlots)[number]['media']) => {
      const cached = mediaCache.get(media.id);
      if (cached) return cached;
      if (!media.gcsPath) {
        throw new Error(`Original media path missing for Media #${media.id}`);
      }

      this.logger.log(`📥 Downloading original media from GCS: ${media.gcsPath}`);
      const buffer = await this.storageService.downloadFile(media.gcsPath);
      let width = media.width;
      let height = media.height;

      if (!width || !height) {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error(`Unable to determine image dimensions for Media #${media.id}`);
        }
        width = metadata.width;
        height = metadata.height;
      }

      const loaded = {
        buffer,
        width,
        height,
        fileSizeBytes: media.fileSizeBytes || buffer.length,
      };
      mediaCache.set(media.id, loaded);
      return loaded;
    };

    const dbOperations: ReturnType<typeof this.prisma.mediaVariant.upsert>[] = [];

    for (const slot of post.mediaSlots) {
      if (!slot.media || !slot.edit) {
        this.logger.warn(
          `⚠️ Incomplete media/edit instructions for ${slot.platform} position ${slot.position}. Skipping.`,
        );
        continue;
      }

      result.variants++;
      const media = slot.media;
      const edit = slot.edit;

      if (media.fileType !== MediaType.IMAGE) {
        result.reused++;
        continue;
      }

      const original = await loadOriginal(media);
      const mappedPlacement = this.mapPlacement(edit.placement);
      const decision = this.renderHelper.needsRendering(
        slot.platform,
        mappedPlacement,
        original.width,
        original.height,
        original.fileSizeBytes,
        edit,
      );

      this.logger.log(
        `Post #${postId} | ${slot.platform} | position ${slot.position} | render: ${decision.needsRendering} | ${decision.reason}`,
      );

      let finalGcsPath = media.gcsPath!;
      let finalWidth = original.width;
      let finalHeight = original.height;

      if (decision.needsRendering) {
        result.generated++;
        const targetRules =
          PLATFORM_IMAGE_RULES[slot.platform]?.[mappedPlacement]?.recommended;
        const cropWidth = Math.round(edit.cropWidth);
        const cropHeight = Math.round(edit.cropHeight);
        let sharpInstance = sharp(original.buffer).extract({
          left: Math.round(edit.cropX),
          top: Math.round(edit.cropY),
          width: cropWidth,
          height: cropHeight,
        });

        if (edit.rotation) {
          sharpInstance = sharpInstance.rotate(edit.rotation);
        }

        if (targetRules) {
          sharpInstance = sharpInstance.resize({
            width: targetRules.width,
            height: targetRules.height,
            fit: 'cover',
            position: 'center',
          });
        }

        const processed = await sharpInstance
          .toFormat('jpeg', { quality: 90 })
          .toBuffer({ resolveWithObject: true });
        finalWidth = processed.info.width;
        finalHeight = processed.info.height;
        const fileName =
          `variants/post-${postId}/${slot.platform.toLowerCase()}-${slot.position}-media-${media.id}-v${edit.version}.jpg`;

        finalGcsPath = await this.storageService.uploadFile(
          processed.data,
          fileName,
          'image/jpeg',
        );
      } else {
        result.reused++;
      }

      const variantData = {
        gcsPath: finalGcsPath,
        cdnUrl: '',
        width: finalWidth,
        height: finalHeight,
        status: 'READY' as const,
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

    if (dbOperations.length > 0) {
      await this.prisma.$transaction(dbOperations);
    }

    return result;
  }
}
