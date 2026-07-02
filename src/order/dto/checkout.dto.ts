import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CheckoutDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'شناسه آدرس باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه آدرس معتبر نیست' })
  addressId?: number;

  @IsOptional()
  @IsString({ message: 'کد تخفیف باید متن باشد' })
  @Length(2, 50, { message: 'کد تخفیف باید بین ۲ تا ۵۰ کاراکتر باشد' })
  couponCode?: string;

  @IsOptional()
  @IsString({ message: 'نام گیرنده باید متن باشد' })
  shippingReceiverName?: string;

  @IsOptional()
  @IsString({ message: 'شماره موبایل گیرنده باید متن باشد' })
  shippingReceiverMobile?: string;

  @IsOptional()
  @IsString({ message: 'استان باید متن باشد' })
  shippingProvince?: string;

  @IsOptional()
  @IsString({ message: 'شهر باید متن باشد' })
  shippingCity?: string;

  @IsOptional()
  @IsString({ message: 'آدرس باید متن باشد' })
  shippingAddressLine?: string;

  @IsOptional()
  @IsString({ message: 'کد پستی باید متن باشد' })
  shippingPostalCode?: string;

  @IsOptional()
  @IsString({ message: 'پلاک باید متن باشد' })
  shippingPlaque?: string;

  @IsOptional()
  @IsString({ message: 'واحد باید متن باشد' })
  shippingUnit?: string;
}