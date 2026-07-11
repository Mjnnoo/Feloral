import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FeaturedProducts } from "@/components/home/featured-products";

export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="luxury-container py-14">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm">
          <span className="text-sm font-bold text-gold">فروشگاه</span>
          <h1 className="mt-3 font-display text-5xl font-black">محصولات فلورال</h1>
          <p className="mt-4 text-muted">در مرحله بعد این صفحه را به API محصولات بک‌اند وصل می‌کنیم.</p>
        </div>
      </main>
      <FeaturedProducts />
      <SiteFooter />
    </>
  );
}
