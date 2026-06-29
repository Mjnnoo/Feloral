import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  @Matches(/^\+?[0-9]+$/, {
    message: 'receiverMobile must contain only numbers and may start with +',
  })
  receiverMobile?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  province?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(5, 500)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'postalCode must be exactly 10 digits',
  })
  postalCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  plaque?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}