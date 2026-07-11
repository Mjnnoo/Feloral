import { EditableContentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertContentDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsEnum(EditableContentType)
  type?: EditableContentType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  plainText?: string;

  @IsOptional()
  value?: unknown;

  @IsOptional()
  @IsString()
  sectionKey?: string;

  @IsOptional()
  @IsNumber()
  mediaId?: number;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  fontWeight?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;
}
