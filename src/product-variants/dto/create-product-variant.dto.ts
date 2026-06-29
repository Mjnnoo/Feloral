import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  sku!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  volume?: number;

  @IsOptional()
  @IsString()
  @Length(4, 80)
  barcode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;
}