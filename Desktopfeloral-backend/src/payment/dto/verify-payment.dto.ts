import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class VerifyPaymentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  authority?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.trim().toUpperCase()
      : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}
