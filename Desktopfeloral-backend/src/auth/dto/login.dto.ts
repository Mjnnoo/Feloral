import { Transform } from 'class-transformer';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
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
}