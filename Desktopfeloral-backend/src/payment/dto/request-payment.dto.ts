import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class RequestPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;
}
