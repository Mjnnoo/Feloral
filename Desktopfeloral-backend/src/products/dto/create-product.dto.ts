import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  englishName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shortDesc?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
