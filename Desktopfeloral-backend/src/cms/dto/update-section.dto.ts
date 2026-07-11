import { HomepageSectionStatus, HomepageSectionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsEnum(HomepageSectionType)
  type?: HomepageSectionType;

  @IsOptional()
  @IsEnum(HomepageSectionStatus)
  status?: HomepageSectionStatus;

  @IsOptional()
  @IsString()
  title?: string | null;

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
