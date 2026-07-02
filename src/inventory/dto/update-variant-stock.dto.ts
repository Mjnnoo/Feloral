import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateVariantStockDto {
  @Type(() => Number)
  @IsInt({ message: 'موجودی باید عدد صحیح باشد' })
  @Min(0, { message: 'موجودی نمی‌تواند کمتر از صفر باشد' })
  stock!: number;
}