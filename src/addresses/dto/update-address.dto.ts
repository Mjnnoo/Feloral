import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString({ message: 'عنوان آدرس باید متن باشد' })
  @Length(2, 80, { message: 'عنوان آدرس باید بین ۲ تا ۸۰ کاراکتر باشد' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'نام گیرنده باید متن باشد' })
  @Length(2, 120, { message: 'نام گیرنده باید بین ۲ تا ۱۲۰ کاراکتر باشد' })
  receiverName?: string;

  @IsOptional()
  @IsString({ message: 'شماره موبایل گیرنده باید متن باشد' })
  @Length(10, 15, { message: 'شماره موبایل گیرنده باید بین ۱۰ تا ۱۵ رقم باشد' })
  @Matches(/^\+?[0-9]+$/, {
    message: 'شماره موبایل گیرنده باید فقط شامل عدد باشد و می‌تواند با + شروع شود',
  })
  receiverMobile?: string;

  @IsOptional()
  @IsString({ message: 'استان باید متن باشد' })
  @Length(2, 80, { message: 'استان باید بین ۲ تا ۸۰ کاراکتر باشد' })
  province?: string;

  @IsOptional()
  @IsString({ message: 'شهر باید متن باشد' })
  @Length(2, 80, { message: 'شهر باید بین ۲ تا ۸۰ کاراکتر باشد' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'آدرس باید متن باشد' })
  @Length(5, 500, { message: 'آدرس باید بین ۵ تا ۵۰۰ کاراکتر باشد' })
  addressLine?: string;

  @IsOptional()
  @IsString({ message: 'کد پستی باید متن باشد' })
  @Matches(/^[0-9]{10}$/, {
    message: 'کد پستی باید دقیقاً ۱۰ رقم باشد',
  })
  postalCode?: string;

  @IsOptional()
  @IsString({ message: 'پلاک باید متن باشد' })
  @Length(1, 20, { message: 'پلاک باید بین ۱ تا ۲۰ کاراکتر باشد' })
  plaque?: string;

  @IsOptional()
  @IsString({ message: 'واحد باید متن باشد' })
  @Length(1, 20, { message: 'واحد باید بین ۱ تا ۲۰ کاراکتر باشد' })
  unit?: string;

  @IsOptional()
  @IsBoolean({ message: 'وضعیت پیش‌فرض بودن آدرس باید true یا false باشد' })
  isDefault?: boolean;
}