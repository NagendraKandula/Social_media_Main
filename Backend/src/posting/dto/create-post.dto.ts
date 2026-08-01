// dto/create-post.dto.ts
import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsObject, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentMetadata } from '../interfaces/content-metadata.interface';
import { Platform, MediaType } from '@prisma/client'; // ✅ Import Prisma Enums

export class MediaItemDto {
  @IsString()
  mediaUrl!: string;

  @IsString()
  storagePath!: string;

  @IsString()
  mimeType!: string;

  @IsEnum(MediaType) // ✅ Use Prisma MediaType
  mediaType!: MediaType;

  @IsNumber()
  @IsOptional()
  size?: number;
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems?: MediaItemDto[];

  @IsArray()
  @IsEnum(Platform, { each: true, message: 'Invalid platform provided' }) // ✅ Validate Platforms
  platforms?: Platform[];

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