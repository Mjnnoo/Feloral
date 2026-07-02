import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateProductImageDto {
  @IsOptional()
  @IsString({ message: 'آدرس تصویر باید متن باشد' })
  @Length(2, 500, { message: 'آدرس تصویر باید بین ۲ تا ۵۰۰ کاراکتر باشد' })
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'شناسه محصول باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه محصول معتبر نیست' })
  productId?: number;

  @IsOptional()
  @IsString({ message: 'متن جایگزین تصویر باید متن باشد' })
  @Length(2, 200, {
    message: 'متن جایگزین تصویر باید بین ۲ تا ۲۰۰ کاراکتر باشد',
  })
  alt?: string;

  @IsOptional()
  @IsBoolean({ message: 'وضعیت تصویر اصلی باید true یا false باشد' })
  isPrimary?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ترتیب نمایش باید عدد صحیح باشد' })
  @Min(0, { message: 'ترتیب نمایش نمی‌تواند کمتر از صفر باشد' })
  sortOrder?: number;
}