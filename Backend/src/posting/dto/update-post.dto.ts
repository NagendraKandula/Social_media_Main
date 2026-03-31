import { IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostStatus } from '@prisma/client'; 

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  // Replaced singular 'platform' with the array 'platforms'
  @IsOptional()
  @IsArray()
  platforms?: string[]; 

  // Added contentMetadata so it allows Facebook Page IDs to pass through!
  @IsOptional()
  contentMetadata?: any;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(PostStatus)
  status?: PostStatus;


  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  storagePath?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;
}