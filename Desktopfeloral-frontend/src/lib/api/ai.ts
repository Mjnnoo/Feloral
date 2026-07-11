import { apiClient } from "./client";

export type GenerateProductContentInput = {
  productId?: number;
  title: string;
  brand?: string;
  category?: string;
  notes?: string[];
  rawText?: string;
};

export type GenerateProductContentResult = {
  title: string;
  shortDescription: string;
  description: string;
  usageTips: string[];
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

/**
 * بعداً در بک‌اند مسیر مشابه این را می‌سازیم:
 * POST /ai/products/generate-content
 */
export async function generateProductContent(input: GenerateProductContentInput) {
  const res = await apiClient.post<GenerateProductContentResult>(
    "/ai/products/generate-content",
    input
  );
  return res.data;
}

export type PriceComparisonResult = {
  productId: number;
  sources: {
    siteName: string;
    price: number;
    currency: "IRR" | "TOMAN";
    url: string;
    lastCheckedAt: string;
  }[];
};

/**
 * بعداً در بک‌اند:
 * GET /ai/products/:id/price-comparison
 * نکته: قیمت رقبا باید از API، فید یا crawler قانونی backend بیاید؛ نه مستقیم از مرورگر مشتری.
 */
export async function getPriceComparison(productId: number) {
  const res = await apiClient.get<PriceComparisonResult>(
    `/ai/products/${productId}/price-comparison`
  );
  return res.data;
}
