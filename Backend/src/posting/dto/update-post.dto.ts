import { IsEnum, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostStatus } from '@prisma/client'; 

export class UpdatePostDto {
  @IsOptional()
  @IsString({ message: 'Content must be a text string' })
  content?: string;

  // Added this to support your PostPlatform relation logic!
  @IsOptional()
  @IsString({ message: 'Platform must be a text string' })
  platform?: string; 

  @IsOptional()
  // Automatically fixes frontend casing issues (e.g., "scheduled" -> "SCHEDULED")
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(PostStatus, {
    message: 'Status must be a valid state defined in your Prisma schema (e.g., SCHEDULED, PENDING)',
  })
  status?: PostStatus;
}