import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductCardV3 } from "@/components/product/product-card-v3";
import { getProducts } from "@/lib/catalog/catalog-api";
import {
  toCatalogProductCard,
} from "@/lib/catalog/products";
import type { CatalogProduct } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  let products: CatalogProduct[] = [];
  let loadFailed = false;

  try {
    products = await getProducts();
  } catch (error) {
    loadFailed = true;
    console.error(
      "Feloral catalog products fetch failed:",
      error,
    );
  }

  const cards = products.map(toCatalogProductCard);

  return (
    <>
      <SiteHeader />

      <main className="luxury-container py-14">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm">
          <span className="text-sm font-bold text-gold">
            فروشگاه
          </span>

          <h1 className="mt-3 font-display text-5xl font-black">
            محصولات فلورال
          </h1>

          <p className="mt-4 text-muted">
            {loadFailed
              ? "در دریافت محصولات مشکلی پیش آمده است."
              : `${cards.length.toLocaleString(
                  "fa-IR",
                )} محصول فعال`}
          </p>
        </div>

        {loadFailed ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center">
            <p className="font-bold">
              دریافت محصولات فروشگاه انجام نشد.
            </p>
            <p className="mt-2 text-sm text-black/50">
              اتصال بک‌اند را بررسی کرده و صفحه را دوباره
              بارگذاری کنید.
            </p>
          </div>
        ) : cards.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center">
            هنوز محصول فعالی برای نمایش وجود ندارد.
          </div>
        ) : (
          <section className="mt-10">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cards.map((product) => (
                <ProductCardV3
                  key={product.id}
                  name={product.name}
                  type={product.type}
                  price={product.price}
                  badge={product.badge}
                  image={product.image}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}