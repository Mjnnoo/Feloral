import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ProductRegionType } from '@prisma/client';


export class CreateTryOnSessionDto {

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;


  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  shadeId?: number;


  @IsEnum(ProductRegionType)
  region: ProductRegionType;


  @IsBoolean()
  consentAccepted: boolean;

}