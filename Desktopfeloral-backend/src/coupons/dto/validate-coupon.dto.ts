import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class ValidateCouponDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  code: string;
}
