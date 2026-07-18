import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import {
  CatalogAdminQueryDto,
  PublicCatalogQueryDto,
} from '../../catalog/dto/catalog-query.dto';

export class PublicProductsQueryDto extends PublicCatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}

export class QueryProductsDto extends CatalogAdminQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}
