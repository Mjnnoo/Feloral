import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  @Matches(/^\+?[0-9]+$/, {
    message: 'mobile must contain only numbers and may start with +',
  })
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}