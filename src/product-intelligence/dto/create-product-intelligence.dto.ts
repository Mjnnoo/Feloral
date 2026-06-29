import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductIntelligenceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @IsString()
  @Length(2, 160)
  aiGeneratedTitle?: string;

  @IsOptional()
  @IsString()
  aiGeneratedShortDesc?: string;

  @IsOptional()
  @IsString()
  aiGeneratedDescription?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  seoKeywords?: string[];

  @IsOptional()
  @IsString()
  storyTitle?: string;

  @IsOptional()
  @IsString()
  storyText?: string;

  @IsOptional()
  @IsString()
  howToUse?: string;

  @IsOptional()
  @IsString()
  warnings?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  suitableFor?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayUnique()
  complementaryProductIds?: number[];
}