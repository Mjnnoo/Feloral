import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}