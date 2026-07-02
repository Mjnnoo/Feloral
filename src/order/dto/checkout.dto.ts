import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutDto {
  @Type(() => Number)
  @IsOptional()
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
}