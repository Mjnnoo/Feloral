import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ProductRegionType } from '@prisma/client';

export class CreateTryOnSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shadeId?: number;

  @IsOptional()
  @IsEnum(ProductRegionType)
  region?: ProductRegionType;

  @IsOptional()
  @IsString()
  sourceImageUrl?: string;

  @IsBoolean()
  consentAccepted!: boolean;
}