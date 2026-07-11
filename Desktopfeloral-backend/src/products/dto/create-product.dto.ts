export class CreateProductDto {
  name: string;
  englishName?: string;

  slug: string;

  description?: string;
  shortDesc?: string;

  brandId: number;
  categoryId: number;

  isActive?: boolean;
}