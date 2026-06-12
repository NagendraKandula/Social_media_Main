import { IsEnum, IsString, IsOptional, IsArray,ValidateNested } from 'class-validator';
import { Transform ,Type} from 'class-transformer';
import { PostStatus } from '@prisma/client'; 
import {MediaItemDto} from './create-post.dto';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

 @IsOptional()
  @IsArray()
  platforms?: string[];

  @IsOptional()
  contentMetadata?: any;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(PostStatus)
  status?: PostStatus;

 @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems?: MediaItemDto[];
} 