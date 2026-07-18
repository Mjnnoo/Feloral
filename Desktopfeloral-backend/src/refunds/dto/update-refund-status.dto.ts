import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REFUND_STATUSES = [
  'processing',
  'succeeded',
  'failed',
  'canceled',
] as const;

export class UpdateRefundStatusDto {
  @IsIn(REFUND_STATUSES)
  status: (typeof REFUND_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gatewayReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
