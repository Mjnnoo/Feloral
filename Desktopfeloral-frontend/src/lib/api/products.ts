import { apiClient } from "./client";
import type { Product } from "@/types/product";

export async function getProducts() {
  const res = await apiClient.get<{ data: Product[] }>("/products");
  return res.data.data;
}

export async function getProductBySlug(slug: string) {
  const res = await apiClient.get<Product>(`/products/${slug}`);
  return res.data;
}
