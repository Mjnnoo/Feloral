import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  englishName?: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 160)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(2, 300)
  shortDesc?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  brandId!: number;

  @IsInt()
  @Min(1)
  categoryId!: number;
}