import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد',
  })
  mobile: string;

  @IsString()
  @MinLength(8, {
    message: 'رمز عبور باید حداقل 8 کاراکتر باشد',
  })
  @MaxLength(72, {
    message: 'رمز عبور نباید بیشتر از 72 کاراکتر باشد',
  })
  password: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const email = value.trim().toLowerCase();
    return email === '' ? undefined : email;
  })
  @IsOptional()
  @IsEmail({}, {
    message: 'ایمیل معتبر نیست',
  })
  @MaxLength(254)
  email?: string;
}