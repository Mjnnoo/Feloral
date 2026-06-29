import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { TryOnStatus } from '@prisma/client';

export class UpdateTryOnResultDto {
  @IsEnum(TryOnStatus)
  status!: TryOnStatus;

  @IsOptional()
  @IsString()
  resultImageUrl?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}