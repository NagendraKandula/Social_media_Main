import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateContentDto {
  @IsOptional()
  @IsString()
  //@IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  type: string; // e.g., 'Generate Hashtags', 'Generate Caption', etc.
}