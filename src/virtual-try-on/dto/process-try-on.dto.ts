import {
  IsOptional,
  IsString,
} from 'class-validator';

export class ProcessTryOnDto {
  @IsOptional()
  @IsString()
  resultImageUrl?: string;

  @IsOptional()
  @IsString()
  processingNote?: string;
}