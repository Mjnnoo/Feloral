import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ShippingProvider } from '@prisma/client';

export class CheckoutDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @IsString()
  shippingReceiverName?: string;

  @IsOptional()
  @IsString()
  shippingReceiverMobile?: string;

  @IsOptional()
  @IsString()
  shippingProvince?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postexCityId?: number;

  @IsOptional()
  @IsString()
  shippingAddressLine?: string;

  @IsOptional()
  @IsString()
  shippingPostalCode?: string;

  @IsOptional()
  @IsString()
  shippingPlaque?: string;

  @IsOptional()
  @IsString()
  shippingUnit?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  /**
   * فعلاً برای پستکس، provider داخل سفارش همان post ذخیره می‌شود.
   * قیمت واقعی از پستکس گرفته می‌شود، نه از calculateShippingCost داخلی.
   */
  @IsOptional()
  shippingProvider?: ShippingProvider;

  @IsString()
  @IsNotEmpty()
  courierCode!: string;

  @IsString()
  @IsNotEmpty()
  serviceType!: string;
}