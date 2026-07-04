import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CartShippingQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toCityCode!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boxTypeId?: number;

  @IsOptional()
  @IsBoolean()
  pickupNeeded?: boolean;
}