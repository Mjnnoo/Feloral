import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductRegionType } from '@prisma/client';

export class CreatePhotoTryOnDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  shadeId?: number;

  @IsOptional()
  region?: ProductRegionType;

  @IsString()
  sourceImageUrl: string;

  @IsBoolean()
  consentAccepted: boolean;
}