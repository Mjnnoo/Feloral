import Link from "next/link";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import { nav, topLinks } from "@/data/home-v3";
import type { CmsHomepageResponse } from "@/lib/cms/types";
import { getImageUrl, getText } from "@/lib/cms/content";
import { CmsEditMarker } from "@/components/cms/cms-edit-marker";
import { HeaderDragEditor } from "../cms/header-drag-editor";
import { CmsImageEditButton } from "@/components/cms/cms-image-edit-button";

type Props = {
  cms?: CmsHomepageResponse | null;
  logoText?: string;
  accentColor?: string;
  darkColor?: string;
};

const topLinkKeyMap: Record<string, string> = {
  "/about": "site.top.about",
  "/contact": "site.top.contact",
  "/guide": "site.top.guide",
};

const navKeyMap: Record<string, string> = {
  "/": "site.nav.home",
  "/brands": "site.nav.brands",
  "/shop": "site.nav.categories",
  "/offers": "site.nav.offers",
};

export function SiteHeader({
  cms = null,
  logoText: defaultLogoText = "FELORAL",
  accentColor = "#d6a84f",
  darkColor = "#070707",
}: Props) {
  const shippingNotice = getText(
    cms,
    "site.top.shippingNotice",
    "ارسال رایگان برای خریدهای بالای ۱,۵۰۰,۰۰۰ تومان",
  );

  const cartLabel = getText(cms, "site.header.cartLabel", "سبد خرید");
  const loginLabel = getText(cms, "site.header.loginLabel", "ورود / ثبت‌نام");
  const searchPlaceholder = getText(cms, "site.header.searchPlaceholder", "جستجوی محصول، برند یا دسته...");

  const logoTextValue = getText(cms, "site.logo.text", defaultLogoText || "FELORAL");
  const logoImage = getImageUrl(cms, "site.logo.text", "");

  return (
    <header className="text-white" style={{ backgroundColor: darkColor }}>
      <HeaderDragEditor />

      <div data-feloral-topbar-exact="v5" className="feloral-topbar-final" dir="ltr">
        <div data-feloral-topbar-side="shipping" dir="rtl" style={{ color: accentColor }}>
          <CmsEditMarker
            cmsKey="site.top.shippingNotice"
            sectionKey="site.header"
            label="اطلاعیه ارسال"
            value={shippingNotice}
          >
            <span className="inline-flex items-center gap-2 leading-none">
              <span data-feloral-topbar-shipping-icon="true" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v9H3z" />
                  <path d="M14 10h4l3 3v3h-7z" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="17" cy="18" r="2" />
                </svg>
              </span>
              <span>{shippingNotice}</span>
            </span>
          </CmsEditMarker>
        </div>

        <div data-feloral-topbar-side="links" dir="rtl">
          {topLinks.map((link, index) => {
            const cmsKey = topLinkKeyMap[link.href] || `site.top.link.${index + 1}`;
            const label = getText(cms, cmsKey, link.label);

            return (
              <CmsEditMarker
                key={link.href}
                cmsKey={cmsKey}
                sectionKey="site.header"
                label={`لینک بالای هدر ${link.label}`}
                value={label}
              >
                <a href={link.href} className="transition">
                  {label}
                </a>
              </CmsEditMarker>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/7">
        <div
          data-feloral-mainbar-clean-logo="v1"
          data-feloral-mainbar-center-logo="v2"
          data-feloral-mainbar="v1"
          className="luxury-container grid min-h-[90px] grid-cols-[1fr_auto_1fr] items-center gap-8"
        >
          <div className="flex items-center gap-8">
            <Link
              data-feloral-header-cart="left"
              href="/cart"
              className="relative flex items-center gap-2 text-sm font-bold text-white/88 transition hover:opacity-80"
            >
              <ShoppingCart size={26} strokeWidth={1.6} />

              <span>
                <CmsEditMarker cmsKey="site.header.cartLabel" sectionKey="site.header" label="برچسب سبد خرید">
                  {cartLabel}
                </CmsEditMarker>
              </span>

              <span
                className="absolute -top-3 right-4 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] text-black"
                style={{ backgroundColor: accentColor }}
              >
                ۳
              </span>
            </Link>

            <Link href="/account" className="flex items-center gap-2 text-sm font-bold text-white/88 transition hover:opacity-80">
              <UserRound size={25} strokeWidth={1.6} />

              <span>
                <CmsEditMarker cmsKey="site.header.loginLabel" sectionKey="site.header" label="برچسب ورود و ثبت‌نام">
                  {loginLabel}
                </CmsEditMarker>
              </span>
            </Link>

            <div className="relative hidden w-[330px] xl:block">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={22} strokeWidth={1.5} />

              <input
                className="h-[52px] w-full rounded-xl border border-white/16 bg-white/[.035] pr-12 text-sm text-white outline-none transition placeholder:text-white/43"
                placeholder={searchPlaceholder}
              />
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <Link href="/" className="flex items-center justify-center gap-3">
              {logoImage ? (
                <img
                  src={logoImage}
                  alt={logoTextValue || "Feloral"}
                  className="h-14 w-auto max-w-[210px] object-contain"
                />
              ) : (
                <span className="text-2xl font-black tracking-[-0.04em] text-white">
                  <CmsEditMarker cmsKey="site.logo.text" sectionKey="site.logo" label="متن لوگو">
                    {logoTextValue}
                  </CmsEditMarker>
                </span>
              )}
            </Link>

            <CmsImageEditButton
              cmsKey="site.logo.text"
              sectionKey="site.logo"
              label="ویرایش عکس لوگو"
              currentUrl={logoImage}
              className="-right-8 -top-4"
            />
          </div>

          <nav data-feloral-header-nav="right" className="flex items-center justify-end gap-12 text-[15px] font-bold">
            {nav.map((item, index) => {
              const cmsKey = navKeyMap[item.href] || `site.nav.${index + 1}`;
              const label = getText(cms, cmsKey, item.label);

              return (
                <Link key={item.href} href={item.href} className="group relative py-3 text-white/88 transition hover:opacity-80">
                  <CmsEditMarker cmsKey={cmsKey} sectionKey="site.header" label={`منو ${item.label}`}>
                    {label}
                  </CmsEditMarker>

                  <span
                    className={`absolute -bottom-1 right-0 h-[2px] rounded-full transition-all ${
                      index === 0 ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                    style={{ backgroundColor: accentColor }}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
