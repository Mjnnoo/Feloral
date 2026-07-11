import { featuredProducts } from "@/data/home-products";
import { ProductCard } from "@/components/product/product-card";

export function FeaturedProducts() {
  return (
    <section className="luxury-container mt-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-sm font-bold text-gold">پیشنهاد ویژه</span>
          <h2 className="mt-2 font-display text-4xl font-black">پرفروش‌ترین محصولات</h2>
        </div>
        <a href="/shop" className="text-sm font-semibold text-muted transition hover:text-gold">
          مشاهده همه
        </a>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featuredProducts.map((product) => (
          <ProductCard
            key={product.id}
            name={product.name}
            brand={product.brand}
            price={product.price}
            badge={product.badge}
          />
        ))}
      </div>
    </section>
  );
}
