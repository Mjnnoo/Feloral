import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ShippingQuoteDto {
  @IsInt()
  @Min(1)
  toCityCode: number;

  @IsInt()
  @Min(1)
  weightGram: number;

  @IsInt()
  @Min(0)
  valueToman: number;

  @IsInt()
  @Min(1)
  lengthCm: number;

  @IsInt()
  @Min(1)
  widthCm: number;

  @IsInt()
  @Min(1)
  heightCm: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boxTypeId?: number;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  @IsOptional()
  @IsBoolean()
  pickupNeeded?: boolean;
}