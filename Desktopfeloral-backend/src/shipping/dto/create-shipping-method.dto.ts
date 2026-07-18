import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateShippingMethodDto {
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @Matches(/^[a-z0-9][a-z0-9_-]{1,39}$/)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum({ postex: 'postex', post: 'post', tipax: 'tipax', alopeyk: 'alopeyk', snapp: 'snapp', tapsi: 'tapsi', courier: 'courier', free: 'free', other: 'other' })
  provider: 'postex' | 'post' | 'tipax' | 'alopeyk' | 'snapp' | 'tapsi' | 'courier' | 'free' | 'other';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  flatRate: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  freeAbove?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedMinDays?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  estimatedMaxDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}
