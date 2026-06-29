import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  @Matches(/^\+?[0-9]+$/, {
    message: 'mobile must contain only numbers and may start with +',
  })
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}