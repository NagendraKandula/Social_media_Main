import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsObject, IsEnum } from 'class-validator';

import { ContentMetadata } from '../interfaces/content-metadata.interface';
export enum MediaTypeDto {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  REEL = 'REEL',
  STORY = 'STORY',
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  // ✅ MEDIA FIELDS
  @IsString()
  mediaUrl: string;      // Public URL

  @IsString()
  storagePath: string;   // Internal GCS path

  @IsString()
  mimeType: string;      // e.g. "image/jpeg"

  @IsEnum(MediaTypeDto)
  mediaType: MediaTypeDto;

  @IsArray()
  platforms: string[];

  // ✅ SCHEDULING
  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  // ✅ RICH METADATA
  @IsOptional()
  @IsObject()
  contentMetadata?: ContentMetadata;
}