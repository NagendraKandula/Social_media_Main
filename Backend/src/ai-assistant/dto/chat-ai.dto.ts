import { Transform } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class ChatAiDto {
  @IsString()
  @IsNotEmpty()
  instruction?: string;

  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  @IsObject()
  currentAnalysis?: Record<string, any>;
}