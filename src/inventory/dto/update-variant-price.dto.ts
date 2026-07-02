import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateVariantPriceDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'قیمت اصلی باید عدد باشد' })
  @Min(0, { message: 'قیمت اصلی نمی‌تواند کمتر از صفر باشد' })
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'قیمت تخفیفی باید عدد باشد' })
  @Min(0, { message: 'قیمت تخفیفی نمی‌تواند کمتر از صفر باشد' })
  salePrice?: number;
}