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

function normalizeDigits(value: unknown) {
  if (typeof value !== 'string') return value;
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return value
    .trim()
    .replace(/[۰-۹]/g, (char) => String(persian.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String(arabic.indexOf(char)));
}

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  receiverName: string;

  @Transform(({ value }) => normalizeDigits(value))
  @Matches(/^09\d{9}$/, { message: 'شماره همراه گیرنده معتبر نیست' })
  receiverMobile: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  postexCityId?: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  addressLine: string;

  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : normalizeDigits(value),
  )
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'کد پستی باید ۱۰ رقم باشد' })
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plaque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
