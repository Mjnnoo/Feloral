import { ShippingProvider } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @IsString()
  shippingReceiverName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^09\d{9}$/)
  shippingReceiverMobile?: string;

  @IsOptional()
  @IsString()
  shippingProvince?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

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

  @IsOptional()
  @IsEnum(ShippingProvider)
  shippingProvider?: ShippingProvider;
}