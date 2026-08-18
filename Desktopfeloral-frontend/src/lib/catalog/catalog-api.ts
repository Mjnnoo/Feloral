import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
} from "./types";

function getApiBaseUrl() {
  const baseUrl =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  return baseUrl.replace(/\/$/, "");
}

async function catalogFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Catalog request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export function getProducts() {
  return catalogFetch<CatalogProduct[]>("/products");
}

export function getCategories() {
  return catalogFetch<CatalogCategory[]>("/categories");
}

export function getBrands() {
  return catalogFetch<CatalogBrand[]>("/brands");
}

export function getProduct(id: number) {
  return catalogFetch<CatalogProduct>(`/products/${id}`);
}