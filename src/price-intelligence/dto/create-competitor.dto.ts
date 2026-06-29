import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCompetitorDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Length(2, 120)
  slug!: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  priceSelector?: string;

  @IsOptional()
  @IsString()
  salePriceSelector?: string;

  @IsOptional()
  @IsString()
  titleSelector?: string;

  @IsOptional()
  @IsString()
  availabilitySelector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}