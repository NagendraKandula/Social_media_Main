// Backend/src/ai-assistant/dto/generate-content.dto.ts
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class GenerateContentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  platforms?: string[];

  @IsOptional()
  @IsString()
  action?: string; // e.g., 'caption', 'hashtags', 'recommend_platform', 'rewrite'

  @IsOptional()
  @IsString()
  tone?: string; // e.g., 'professional', 'funny', 'casual'

  @IsOptional()
  @IsString()
  language?: string;
}