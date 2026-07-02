import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ValidateCouponDto {
  @IsString({ message: 'کد تخفیف باید متن باشد' })
  @IsNotEmpty({ message: 'کد تخفیف الزامی است' })
  @Length(2, 50, { message: 'کد تخفیف باید بین ۲ تا ۵۰ کاراکتر باشد' })
  code!: string;
}