import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminReturnNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReceiveReturnDto extends AdminReturnNoteDto {
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class RequestReturnRefundDto extends AdminReturnNoteDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}
