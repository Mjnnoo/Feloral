import { EditableContentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateContentDto {
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
  sectionKey?: string | null;

  @IsOptional()
  @IsNumber()
  mediaId?: number | null;

  @IsOptional()
  @IsString()
  fontFamily?: string | null;

  @IsOptional()
  @IsString()
  fontWeight?: string | null;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;
}
