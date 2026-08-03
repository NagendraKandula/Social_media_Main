import { IsEnum, IsString, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PostStatus, Platform } from '@prisma/client'; 
import { PostMediaSlotDto } from './create-post.dto';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  primaryCaption?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true, message: 'Invalid platform provided' })
  platforms?: Platform[];

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaSlotDto)
  mediaSlots?: PostMediaSlotDto[];
}