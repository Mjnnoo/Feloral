import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { products, sidebarCategories } from "@/data/home-v3";
import { ProductCardV3 } from "@/components/product/product-card-v3";

export function ProductsShowcaseV3() {
  return (
    <section className="luxury-container mt-7">
      <div className="grid gap-7 lg:grid-cols-[270px_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-xl border border-black/8 bg-white p-4">
            <h3 className="border-b border-black/8 pb-4 text-center text-lg font-black">دسته‌بندی‌ها</h3>
            <ul className="mt-2">
              {sidebarCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center justify-between border-b border-black/6 px-2 py-3 text-sm font-medium text-black/82 transition hover:text-[#b98732]">
                      <span>{item.label}</span>
                      <Icon size={20} strokeWidth={1.5} />
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/shop" className="flex items-center justify-between px-2 py-3 text-sm font-black text-black transition hover:text-[#b98732]">
                  <span>مشاهده همه دسته‌بندی‌ها</span>
                  <ChevronLeft size={18} />
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <Link href="/shop" className="flex items-center gap-1 text-xs font-bold text-black/60 transition hover:text-[#b98732]">
              مشاهده همه
              <ChevronLeft size={15} />
            </Link>
            <h2 className="text-[22px] font-black">🔥 پرفروش‌ترین محصولات</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCardV3 key={product.id} {...product} />
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <Link href="/offers" className="relative min-h-[118px] overflow-hidden rounded-xl bg-black p-6 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(201,154,66,.25),transparent_15rem)]" />
              <div className="relative">
                <p className="text-sm font-bold text-[#d8ad5d]">پیشنهاد ویژه</p>
                <h3 className="mt-2 text-2xl font-black text-[#d8ad5d]">تا ۳۰٪ تخفیف</h3>
                <p className="mt-1 text-sm text-white/75">برای محصولات منتخب</p>
              </div>
            </Link>

            <Link href="/new" className="relative min-h-[118px] overflow-hidden rounded-xl bg-[#f5eee4] p-6">
              <div className="absolute left-10 top-4 flex gap-3 opacity-80">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 w-10 rounded-lg bg-gradient-to-b from-[#d8ad5d] to-black" />
                ))}
              </div>
              <div className="relative">
                <h3 className="text-2xl font-black">جدیدترین عطرهای ۲۰۲۶</h3>
                <p className="mt-2 text-sm text-black/55">از بهترین برندهای دنیا</p>
                <span className="mt-4 inline-flex rounded-md bg-[#d8ad5d] px-4 py-2 text-xs font-black text-black">
                  مشاهده محصولات
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
