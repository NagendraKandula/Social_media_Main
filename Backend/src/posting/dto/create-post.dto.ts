import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentMetadata } from '../interfaces/content-metadata.interface';

export enum MediaTypeDto {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  REEL = 'REEL',
  STORY = 'STORY',
}

// ✅ 1. Create a DTO for individual media items
export class MediaItemDto {
  @IsString()
  mediaUrl?: string;

  @IsString()
  storagePath?: string;

  @IsString()
  mimeType?: string;

  @IsEnum(MediaTypeDto)
  mediaType?: MediaTypeDto;
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  // ❌ REMOVE OLD MEDIA FIELDS: mediaUrl, storagePath, mimeType, mediaType

  // ✅ 2. Replace with an Array of Media Items
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems?: MediaItemDto[];

  @IsArray()
  platforms?: string[];

  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  contentMetadata?: ContentMetadata;
}