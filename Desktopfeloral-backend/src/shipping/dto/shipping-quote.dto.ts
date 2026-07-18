import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ShippingQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingMethodId: number;
}
