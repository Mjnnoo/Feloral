export type Product = {
  id: number;
  title: string;
  englishName?: string | null;
  slug: string;
  brand?: {
    id: number;
    name: string;
  } | null;
  category?: {
    id: number;
    title: string;
  } | null;
  price?: number;
  salePrice?: number | null;
  image?: string | null;
  images?: {
    id: number;
    url: string;
    alt?: string | null;
  }[];
  stock?: number;
};
