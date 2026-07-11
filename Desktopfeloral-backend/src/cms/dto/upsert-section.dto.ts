import { HomepageSectionStatus, HomepageSectionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertSectionDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsEnum(HomepageSectionType)
  type?: HomepageSectionType;

  @IsOptional()
  @IsEnum(HomepageSectionStatus)
  status?: HomepageSectionStatus;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  settings?: unknown;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
