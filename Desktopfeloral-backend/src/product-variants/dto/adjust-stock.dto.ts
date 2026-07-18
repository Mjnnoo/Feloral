import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  delta: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}
