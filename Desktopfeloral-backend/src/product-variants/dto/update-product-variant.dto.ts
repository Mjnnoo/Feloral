import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateProductVariantDto } from './create-product-variant.dto';

export class UpdateProductVariantDto extends PartialType(
  OmitType(CreateProductVariantDto, ['stock'] as const),
) {}
