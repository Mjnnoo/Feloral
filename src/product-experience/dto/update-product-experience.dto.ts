import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateProductExperienceDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  visualTheme?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  mood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  colorPalette?: string[];

  @IsOptional()
  @IsString()
  motionPreset?: string;

  @IsOptional()
  @IsString()
  heroVideoUrl?: string;

  @IsOptional()
  @IsString()
  threeDModelUrl?: string;

  @IsOptional()
  @IsString()
  arModelUrl?: string;

  @IsOptional()
  @IsString()
  scentFamily?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  topNotes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  middleNotes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  baseNotes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  season?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  occasion?: string[];

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  longevity?: string;

  @IsOptional()
  @IsString()
  sillage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  skinTypes?: string[];

  @IsOptional()
  @IsString()
  routineStep?: string;

  @IsOptional()
  @IsString()
  texture?: string;
}