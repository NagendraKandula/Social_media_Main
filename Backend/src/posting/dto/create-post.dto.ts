import { IsString, IsOptional, IsDateString, IsArray, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { Platform, PostStatus } from '@prisma/client'; 

export class PostMediaSlotDto {
  @IsNumber()
  mediaId!: number;

  @IsEnum(Platform)
  platform!: Platform;

  @IsNumber()
  position!: number;

  @IsNumber()
  @IsOptional()
  editId?: number;
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  primaryCaption?: string;

  @IsArray()
  @IsEnum(Platform, { each: true, message: 'Invalid platform provided' })
  platforms!: Platform[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaSlotDto)
  mediaSlots!: PostMediaSlotDto[];
}