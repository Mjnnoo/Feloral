import type {
  CatalogProduct,
  CatalogProductVariant,
} from "./types";

export type CatalogProductCardModel = {
  id: number;
  slug: string;
  name: string;
  type: string;
  price: string;
  badge: string;
  image: string;
  stock: number;
  hasDiscount: boolean;
};

function getAssetBaseUrl() {
  const baseUrl =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  return baseUrl.replace(/\/$/, "");
}

export function toAbsoluteCatalogAssetUrl(
  url: string | null | undefined,
) {
  if (!url) return "";

  const cleanUrl = String(url).trim();

  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("/")) {
    return `${getAssetBaseUrl()}${cleanUrl}`;
  }

  return `${getAssetBaseUrl()}/${cleanUrl}`;
}

export function formatCatalogPrice(
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return "نامشخص";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("fa-IR").format(numericValue);
}

function getPreferredVariant(
  variants: CatalogProductVariant[],
): CatalogProductVariant | null {
  const activeVariants = variants.filter(
    (variant) => variant.isActive,
  );

  if (!activeVariants.length) {
    return null;
  }

  const inStockVariants = activeVariants.filter(
    (variant) => variant.stock > 0,
  );

  const candidates =
    inStockVariants.length > 0
      ? inStockVariants
      : activeVariants;

  return [...candidates].sort((a, b) => {
    const aPrice = Number(a.salePrice || a.price);
    const bPrice = Number(b.salePrice || b.price);

    return aPrice - bPrice;
  })[0];
}

function getProductImage(product: CatalogProduct) {
  const primaryImage =
    product.images.find((image) => image.isPrimary) ||
    product.images[0];

  if (primaryImage?.imageUrl) {
    return toAbsoluteCatalogAssetUrl(
      primaryImage.imageUrl,
    );
  }

  if (product.category?.image) {
    return toAbsoluteCatalogAssetUrl(
      product.category.image,
    );
  }

  return "/products/hero-perfume.png";
}

export function toCatalogProductCard(
  product: CatalogProduct,
): CatalogProductCardModel {
  const variant = getPreferredVariant(
    product.variants || [],
  );

  const regularPrice = variant
    ? Number(variant.price)
    : 0;

  const salePrice =
    variant?.salePrice !== null &&
    variant?.salePrice !== undefined
      ? Number(variant.salePrice)
      : null;

  const hasDiscount =
    salePrice !== null &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice;

  const finalPrice = hasDiscount
    ? salePrice
    : regularPrice;

  const stock = variant?.stock ?? 0;

  let badge = product.brand?.name || "محصول";

  if (stock <= 0) {
    badge = "ناموجود";
  } else if (hasDiscount) {
    badge = "تخفیف";
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type:
      product.category?.name ||
      product.brand?.name ||
      "محصول",
    price:
      finalPrice > 0
        ? formatCatalogPrice(finalPrice)
        : "نامشخص",
    badge,
    image: getProductImage(product),
    stock,
    hasDiscount,
  };
}