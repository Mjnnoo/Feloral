import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PostexQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  boxTypeId?: number;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageTitle?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageCode?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(80)
  courierCode?: string;

  @IsOptional()
  @IsIn(['prepaid', 'postpaid', 'cod', 'free'])
  paymentType?: 'prepaid' | 'postpaid' | 'cod' | 'free';

  @IsOptional()
  @IsIn(['pickup', 'dropoff'])
  pickupType?: 'pickup' | 'dropoff';

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  insured?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  smsNotification?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  packaging?: boolean;
}
