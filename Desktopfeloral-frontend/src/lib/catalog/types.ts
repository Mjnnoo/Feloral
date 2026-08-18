export type CatalogBrand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
};

export type CatalogCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
};

export type CatalogProductImage = {
  id: number;
  imageUrl: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
  productId: number;
};

export type CatalogProductVariant = {
  id: number;
  title: string;
  sku: string;
  volume: number | null;
  barcode: string | null;
  price: string;
  salePrice: string | null;
  stock: number;
  isActive: boolean;
  productId: number;

  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  weightGram: number | null;

  isFragile: boolean;
  isLiquid: boolean;
};

export type CatalogProduct = {
  id: number;
  name: string;
  englishName: string | null;
  slug: string;
  description: string | null;
  shortDesc: string | null;

  isActive: boolean;

  brandId: number | null;
  categoryId: number | null;

  brand: CatalogBrand | null;
  category: CatalogCategory | null;

  images: CatalogProductImage[];
  variants: CatalogProductVariant[];
};