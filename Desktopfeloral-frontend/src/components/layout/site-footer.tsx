import Link from "next/link";
import type { CmsHomepageResponse } from "@/lib/cms/types";
import { getText } from "@/lib/cms/content";
import { CmsEditMarker } from "@/components/cms/cms-edit-marker";

type Props = {
  cms?: CmsHomepageResponse | null;
  logoText?: string;
  accentColor?: string;
  darkColor?: string;
};

export function SiteFooter({ cms = null, logoText = "FELORAL", accentColor = "#d8ad5d", darkColor = "#070707" }: Props) {
  const description = getText(
    cms,
    "site.footer.description",
    "فروشگاه لوکس عطر و زیبایی با تجربه هوشمند خرید، ضمانت اصالت و انتخاب حرفه‌ای رایحه."
  );

  const newsletterTitle = getText(cms, "site.footer.newsletter.title", "خبرنامه");
  const newsletterButton = getText(cms, "site.footer.newsletter.button", "عضویت");

  return (
    <footer className="mt-12 text-white" style={{ backgroundColor: darkColor }}>
      <div className="luxury-container grid gap-10 py-12 lg:grid-cols-[1.4fr_.8fr_.8fr_1.1fr]">
        <div>
          <div className="font-serif text-[34px] font-bold tracking-[.28em]" style={{ color: accentColor }}>
            {logoText}
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
            <CmsEditMarker cmsKey="site.footer.description" sectionKey="site.footer">{description}</CmsEditMarker>
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black">
            <CmsEditMarker cmsKey="site.footer.shop.title" sectionKey="site.footer">{getText(cms, "site.footer.shop.title", "فروشگاه")}</CmsEditMarker>
          </h4>
          <ul className="space-y-3 text-sm text-white/55">
            <li><Link href="/shop?category=women-perfume"><CmsEditMarker cmsKey="site.footer.shop.item1" sectionKey="site.footer">عطر زنانه</CmsEditMarker></Link></li>
            <li><Link href="/shop?category=men-perfume"><CmsEditMarker cmsKey="site.footer.shop.item2" sectionKey="site.footer">عطر مردانه</CmsEditMarker></Link></li>
            <li><Link href="/shop?category=makeup"><CmsEditMarker cmsKey="site.footer.shop.item3" sectionKey="site.footer">میکاپ</CmsEditMarker></Link></li>
            <li><Link href="/shop?category=skin-care"><CmsEditMarker cmsKey="site.footer.shop.item4" sectionKey="site.footer">مراقبت پوست</CmsEditMarker></Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black">
            <CmsEditMarker cmsKey="site.footer.services.title" sectionKey="site.footer">{getText(cms, "site.footer.services.title", "خدمات")}</CmsEditMarker>
          </h4>
          <ul className="space-y-3 text-sm text-white/55">
            <li><Link href="/tracking"><CmsEditMarker cmsKey="site.footer.services.item1" sectionKey="site.footer">پیگیری سفارش</CmsEditMarker></Link></li>
            <li><Link href="/guarantee"><CmsEditMarker cmsKey="site.footer.services.item2" sectionKey="site.footer">ضمانت اصالت کالا</CmsEditMarker></Link></li>
            <li><Link href="/returns"><CmsEditMarker cmsKey="site.footer.services.item3" sectionKey="site.footer">بازگشت کالا</CmsEditMarker></Link></li>
            <li><Link href="/support"><CmsEditMarker cmsKey="site.footer.services.item4" sectionKey="site.footer">پشتیبانی</CmsEditMarker></Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black">
            <CmsEditMarker cmsKey="site.footer.newsletter.title" sectionKey="site.footer">{newsletterTitle}</CmsEditMarker>
          </h4>
          <div className="flex rounded-xl border border-white/12 bg-white/[.04] p-2">
            <input className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-white/35" placeholder="شماره موبایل یا ایمیل" />
            <button className="rounded-lg px-4 py-2 text-xs font-black text-black" style={{ backgroundColor: accentColor }}>
              <CmsEditMarker cmsKey="site.footer.newsletter.button" sectionKey="site.footer">{newsletterButton}</CmsEditMarker>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
