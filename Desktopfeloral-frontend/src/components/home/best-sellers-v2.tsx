import Link from "next/link";
import { products } from "@/data/home-v2";
import { LuxuryProductCard } from "@/components/product/luxury-product-card";

export function BestSellersV2() {
  return (
    <section className="luxury-container mt-24">
      <div className="mb-10 flex items-end justify-between gap-5">
        <div>
          <span className="text-sm font-black text-[#b98732]">Best Sellers</span>
          <h2 className="mt-3 font-display text-5xl font-black leading-tight">انتخاب‌های محبوب</h2>
        </div>
        <Link href="/shop" className="text-sm font-black text-black/48 transition hover:text-[#b98732]">
          مشاهده همه
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <LuxuryProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
