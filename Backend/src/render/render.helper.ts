import { Injectable } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PLATFORM_IMAGE_RULES } from './config/platformrules';
import { RenderDecision } from './render.types';

@Injectable()
export class RenderHelper {
  
  calculateAspectRatio(width: number, height: number): number {
    return width / height;
  }

  needsRendering(
    platform: Platform, 
    postType: 'feed' | 'story', 
    originalWidth: number, 
    originalHeight: number, 
    fileSizeBytes: number
  ): RenderDecision {
    const rules = PLATFORM_IMAGE_RULES[platform]?.[postType];
    
    if (!rules) {
      return { needsRendering: false, reason: 'No strict constraints found for this platform' };
    }

    const aspectRatio = this.calculateAspectRatio(originalWidth, originalHeight);
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const tolerance = 0.01;

    // Bounds Checks
    if (rules.minAspectRatio && aspectRatio < rules.minAspectRatio - tolerance) {
      return { needsRendering: true, reason: `Aspect ratio (${aspectRatio.toFixed(3)}) < minimum (${rules.minAspectRatio})` };
    }
    if (rules.maxAspectRatio && aspectRatio > rules.maxAspectRatio + tolerance) {
      return { needsRendering: true, reason: `Aspect ratio (${aspectRatio.toFixed(3)}) > maximum (${rules.maxAspectRatio})` };
    }
    if (rules.aspectRatio && Math.abs(aspectRatio - rules.aspectRatio) > tolerance) {
      return { needsRendering: true, reason: `Aspect ratio (${aspectRatio.toFixed(3)}) does not match required (${rules.aspectRatio})` };
    }
    if (rules.minWidth && originalWidth < rules.minWidth) {
      return { needsRendering: true, reason: `Width (${originalWidth}px) < minimum (${rules.minWidth}px)` };
    }
    if (rules.maxWidth && originalWidth > rules.maxWidth) {
      return { needsRendering: true, reason: `Width (${originalWidth}px) > maximum (${rules.maxWidth}px)` };
    }
    if (rules.maxSizeMB && fileSizeMB > rules.maxSizeMB) {
      return { needsRendering: true, reason: `Size (${fileSizeMB.toFixed(2)}MB) > maximum (${rules.maxSizeMB}MB)` };
    }

    return { needsRendering: false, reason: 'Fully compliant with platform rules' };
  }
}