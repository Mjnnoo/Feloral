export class CreateProductVariantDto {
  title: string;

  sku: string;

  volume?: number;

  barcode?: string;

  price: number;

  salePrice?: number;

  stock: number;

  isActive?: boolean;

  productId: number;
}