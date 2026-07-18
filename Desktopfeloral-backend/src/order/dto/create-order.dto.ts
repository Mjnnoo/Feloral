import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  shippingMethodId?: number;

  @IsOptional()
  @IsUUID()
  postexQuoteId?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.trim().toUpperCase()
      : undefined,
  )
  @IsOptional()
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  couponCode?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  checkoutKey?: string;
}
