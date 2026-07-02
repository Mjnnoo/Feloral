import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString({ message: 'عنوان آدرس باید متن باشد' })
  @Length(2, 80, { message: 'عنوان آدرس باید بین ۲ تا ۸۰ کاراکتر باشد' })
  title?: string;

  @IsString({ message: 'نام گیرنده باید متن باشد' })
  @IsNotEmpty({ message: 'نام گیرنده الزامی است' })
  @Length(2, 120, { message: 'نام گیرنده باید بین ۲ تا ۱۲۰ کاراکتر باشد' })
  receiverName!: string;

  @IsString({ message: 'شماره موبایل گیرنده باید متن باشد' })
  @IsNotEmpty({ message: 'شماره موبایل گیرنده الزامی است' })
  @Length(10, 15, { message: 'شماره موبایل گیرنده باید بین ۱۰ تا ۱۵ رقم باشد' })
  @Matches(/^\+?[0-9]+$/, {
    message: 'شماره موبایل گیرنده باید فقط شامل عدد باشد و می‌تواند با + شروع شود',
  })
  receiverMobile!: string;

  @IsString({ message: 'استان باید متن باشد' })
  @IsNotEmpty({ message: 'استان الزامی است' })
  @Length(2, 80, { message: 'استان باید بین ۲ تا ۸۰ کاراکتر باشد' })
  province!: string;

  @IsString({ message: 'شهر باید متن باشد' })
  @IsNotEmpty({ message: 'شهر الزامی است' })
  @Length(2, 80, { message: 'شهر باید بین ۲ تا ۸۰ کاراکتر باشد' })
  city!: string;

  @IsString({ message: 'آدرس باید متن باشد' })
  @IsNotEmpty({ message: 'آدرس الزامی است' })
  @Length(5, 500, { message: 'آدرس باید بین ۵ تا ۵۰۰ کاراکتر باشد' })
  addressLine!: string;

  @IsString({ message: 'کد پستی باید متن باشد' })
  @IsNotEmpty({ message: 'کد پستی الزامی است' })
  @Matches(/^[0-9]{10}$/, {
    message: 'کد پستی باید دقیقاً ۱۰ رقم باشد',
  })
  postalCode!: string;

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