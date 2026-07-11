import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { products, sidebarCategories } from "@/data/home-v3";
import { ProductCardV3 } from "@/components/product/product-card-v3";
import type { CmsHomepageResponse } from "@/lib/cms/types";
import { getImageUrl, getSectionTitle, getText } from "@/lib/cms/content";
import { CmsEditMarker } from "@/components/cms/cms-edit-marker";

type Props = {
  cms: CmsHomepageResponse | null;
};

export function CmsProductsShowcase({ cms }: Props) {
  const accentColor = cms?.theme?.accentColor || "#d6a84f";
  const title = getText(cms, "home.products.title", getSectionTitle(cms, "home.products", "محصولات منتخب"));
  const sidebarTitle = getText(cms, "home.sidebar.title", "دسته‌بندی‌ها");
  const allCategories = getText(cms, "home.sidebar.allCategories", "مشاهده همه دسته‌بندی‌ها");

  return (
    <section className="luxury-container mt-7">
      <div className="grid gap-7 lg:grid-cols-[270px_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-xl border border-black/8 bg-white p-4">
            <h3 className="border-b border-black/8 pb-4 text-center text-lg font-black">
              <CmsEditMarker cmsKey="home.sidebar.title" sectionKey="home.products">{sidebarTitle}</CmsEditMarker>
            </h3>
            <ul className="mt-2">
              {sidebarCategories.map((item, index) => {
                const Icon = item.icon;
                const cmsKey = `home.sidebar.category${index + 1}.label`;
                const label = getText(cms, cmsKey, item.label);

                return (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center justify-between border-b border-black/6 px-2 py-3 text-sm font-medium text-black/82 transition hover:opacity-70">
                      <span><CmsEditMarker cmsKey={cmsKey} sectionKey="home.products">{label}</CmsEditMarker></span>
                      <Icon size={20} strokeWidth={1.5} />
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/shop" className="flex items-center justify-between px-2 py-3 text-sm font-black text-black transition hover:opacity-70">
                  <span><CmsEditMarker cmsKey="home.sidebar.allCategories" sectionKey="home.products">{allCategories}</CmsEditMarker></span>
                  <ChevronLeft size={18} />
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <Link href="/shop" className="flex items-center gap-1 text-xs font-bold text-black/60 transition hover:opacity-70">
              <CmsEditMarker cmsKey="home.products.viewAll" sectionKey="home.products">{getText(cms, "home.products.viewAll", "مشاهده همه")}</CmsEditMarker>
              <ChevronLeft size={15} />
            </Link>
            <h2 className="text-[22px] font-black">
              🔥 <CmsEditMarker cmsKey="home.products.title" sectionKey="home.products">{title}</CmsEditMarker>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {products.map((product, index) => {
              const prefix = `home.products.item${index + 1}`;

              return (
                <ProductCardV3
                  key={product.id}
                  {...product}
                  name={getText(cms, `${prefix}.name`, product.name)}
                  type={getText(cms, `${prefix}.type`, product.type)}
                  price={getText(cms, `${prefix}.price`, product.price)}
                  badge={getText(cms, `${prefix}.badge`, product.badge)}
                  image={getImageUrl(cms, `${prefix}.image`, product.image)}
                  accentColor={accentColor}
                  cmsKeyPrefix={prefix}
                />
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <Link href="/offers" className="relative min-h-[118px] overflow-hidden rounded-xl bg-black p-6 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(201,154,66,.25),transparent_15rem)]" />
              <div className="relative">
                <p className="text-sm font-bold" style={{ color: accentColor }}>
                  <CmsEditMarker cmsKey="home.offerBanner.eyebrow" sectionKey="home.products">{getText(cms, "home.offerBanner.eyebrow", "پیشنهاد ویژه")}</CmsEditMarker>
                </p>
                <h3 className="mt-2 text-2xl font-black" style={{ color: accentColor }}>
                  <CmsEditMarker cmsKey="home.offerBanner.title" sectionKey="home.products">{getText(cms, "home.offerBanner.title", "تا ۳۰٪ تخفیف")}</CmsEditMarker>
                </h3>
                <p className="mt-1 text-sm text-white/75">
                  <CmsEditMarker cmsKey="home.offerBanner.subtitle" sectionKey="home.products">{getText(cms, "home.offerBanner.subtitle", "برای محصولات منتخب")}</CmsEditMarker>
                </p>
              </div>
            </Link>

            <Link href="/new" className="relative min-h-[118px] overflow-hidden rounded-xl bg-[#f5eee4] p-6">
              <div className="absolute left-10 top-4 flex gap-3 opacity-80">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 w-10 rounded-lg bg-gradient-to-b from-[#d8ad5d] to-black" />
                ))}
              </div>
              <div className="relative">
                <h3 className="text-2xl font-black">
                  <CmsEditMarker cmsKey="home.newBanner.title" sectionKey="home.products">{getText(cms, "home.newBanner.title", "جدیدترین عطرهای ۲۰۲۶")}</CmsEditMarker>
                </h3>
                <p className="mt-2 text-sm text-black/55">
                  <CmsEditMarker cmsKey="home.newBanner.subtitle" sectionKey="home.products">{getText(cms, "home.newBanner.subtitle", "از بهترین برندهای دنیا")}</CmsEditMarker>
                </p>
                <span className="mt-4 inline-flex rounded-md px-4 py-2 text-xs font-black text-black" style={{ backgroundColor: accentColor }}>
                  <CmsEditMarker cmsKey="home.newBanner.cta" sectionKey="home.products">{getText(cms, "home.newBanner.cta", "مشاهده محصولات")}</CmsEditMarker>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
