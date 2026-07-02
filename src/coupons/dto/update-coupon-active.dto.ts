import { IsBoolean } from 'class-validator';

export class UpdateCouponActiveDto {
  @IsBoolean({ message: 'وضعیت فعال بودن کوپن باید true یا false باشد' })
  isActive!: boolean;
}