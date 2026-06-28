export class CreateProductImageDto {
  imageUrl: string;

  productId: number;

  alt?: string;

  isPrimary?: boolean;

  sortOrder?: number;
}