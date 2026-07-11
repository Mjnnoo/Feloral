import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  primaryFont?: string;

  @IsOptional()
  @IsString()
  headingFont?: string;

  @IsOptional()
  @IsString()
  bodyFont?: string;

  @IsOptional()
  @IsString()
  buttonFont?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  darkColor?: string;

  @IsOptional()
  @IsString()
  logoText?: string;

  @IsOptional()
  @IsNumber()
  logoImageId?: number | null;

  @IsOptional()
  availableFonts?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
