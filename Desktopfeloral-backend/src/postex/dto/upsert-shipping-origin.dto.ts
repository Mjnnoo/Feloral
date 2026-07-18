import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpsertShippingOriginDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  senderName: string;

  @Transform(trim)
  @Matches(/^09\d{9}$/)
  senderMobile: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  postexCityId: number;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine: string;

  @Transform(trim)
  @IsOptional()
  @Matches(/^\d{10}$/)
  postalCode?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plaque?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
