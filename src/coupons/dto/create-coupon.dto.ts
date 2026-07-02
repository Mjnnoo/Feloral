import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CouponType } from '@prisma/client';

export class CreateCouponDto {
  @IsString({ message: 'کد تخفیف باید متن باشد' })
  @IsNotEmpty({ message: 'کد تخفیف الزامی است' })
  @Length(2, 50, { message: 'کد تخفیف باید بین ۲ تا ۵۰ کاراکتر باشد' })
  code!: string;

  @IsOptional()
  @IsString({ message: 'عنوان کوپن باید متن باشد' })
  @Length(2, 120, { message: 'عنوان کوپن باید بین ۲ تا ۱۲۰ کاراکتر باشد' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'توضیحات کوپن باید متن باشد' })
  @Length(2, 500, { message: 'توضیحات کوپن باید بین ۲ تا ۵۰۰ کاراکتر باشد' })
  description?: string;

  @IsEnum(CouponType, {
    message: 'نوع کوپن باید percent یا fixed باشد',
  })
  type!: CouponType;

  @Type(() => Number)
  @IsNumber({}, { message: 'مقدار تخفیف باید عدد باشد' })
  @Min(0, { message: 'مقدار تخفیف نمی‌تواند کمتر از صفر باشد' })
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'حداکثر مبلغ تخفیف باید عدد باشد' })
  @Min(0, { message: 'حداکثر مبلغ تخفیف نمی‌تواند کمتر از صفر باشد' })
  maxDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'حداقل مبلغ سفارش باید عدد باشد' })
  @Min(0, { message: 'حداقل مبلغ سفارش نمی‌تواند کمتر از صفر باشد' })
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'محدودیت استفاده باید عدد صحیح باشد' })
  @Min(1, { message: 'محدودیت استفاده باید حداقل ۱ باشد' })
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'محدودیت استفاده برای هر کاربر باید عدد صحیح باشد' })
  @Min(1, { message: 'محدودیت استفاده برای هر کاربر باید حداقل ۱ باشد' })
  usageLimitPerUser?: number;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ شروع کوپن معتبر نیست' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ پایان کوپن معتبر نیست' })
  expiresAt?: string;

  @IsOptional()
  @IsBoolean({ message: 'وضعیت فعال بودن کوپن باید true یا false باشد' })
  isActive?: boolean;
}