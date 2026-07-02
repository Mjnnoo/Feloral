import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class VerifyPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsOptional()
  @IsString()
  status?: string;
}