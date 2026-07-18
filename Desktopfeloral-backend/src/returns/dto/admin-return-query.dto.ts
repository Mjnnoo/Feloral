import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const RETURN_STATUSES = [
  'requested',
  'approved',
  'rejected',
  'received',
  'refund_pending',
  'refunded',
  'canceled',
] as const;

export class AdminReturnQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(RETURN_STATUSES)
  status?: (typeof RETURN_STATUSES)[number];
}
