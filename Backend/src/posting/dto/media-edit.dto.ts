import { Platform, Placement } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class MediaEditDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsEnum(Placement)
  placement!: Placement;

  @IsNumber()
  cropX!: number;

  @IsNumber()
  cropY!: number;

  @IsNumber()
  cropWidth!: number;

  @IsNumber()
  cropHeight!: number;

  @IsNumber()
  rotation!: number;

  @IsOptional()
  @IsNumber()
  focalX?: number;

  @IsOptional()
  @IsNumber()
  focalY?: number;
}