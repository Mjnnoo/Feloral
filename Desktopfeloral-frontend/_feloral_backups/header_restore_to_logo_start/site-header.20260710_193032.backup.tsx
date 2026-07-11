"use client";

import Link from "next/link";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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

type LogoPosition = {
  left: number;
  top: number;
};

const LOGO_CMS_KEY = "site.logo.text";
const LOGO_IMAGE_OVERRIDE_KEY = "feloral.header.logo.image.override.v2";
const LOGO_DRAG_KEY = "feloral.header.logo.drag.v2";

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

function getApiBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000";

  return base.replace(/\/$/, "");
}

function normalizeAssetUrl(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/")) return `${getApiBaseUrl()}${raw}`;
  if (/^(uploads|media|files|static)\//i.test(raw)) return `${getApiBaseUrl()}/${raw}`;

  return raw;
}

function isImageUrl(value: string) {
  const raw = String(value || "").toLowerCase().trim();

  return (
    raw.startsWith("data:image/") ||
    raw.startsWith("blob:") ||
    raw.includes("/uploads/") ||
    raw.includes("/media/") ||
    raw.includes("/files/") ||
    /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(raw)
  );
}

function getImageFromUploadPayload(payload: unknown) {
  const data = payload as any;

  const possible =
    data?.url ||
    data?.data?.url ||
    data?.media?.url ||
    data?.asset?.url ||
    data?.file?.url ||
    data?.path ||
    data?.data?.path ||
    data?.mediaUrl ||
    data?.imageUrl ||
    data?.value ||
    data?.plainText ||
    data?.text ||
    data?.content;

  const image = normalizeAssetUrl(possible ? String(possible) : "");

  return isImageUrl(image) ? image : "";
}

function isEditorMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("editor") === "1";
}

function selectedEditorKey() {
  if (typeof document === "undefined") return "";

  const code = document.querySelector(".cms-editor-sidebar code");
  return (code?.textContent || "").trim();
}

function readLogoPosition(): LogoPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOGO_DRAG_KEY) || "null");

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.left === "number" &&
      typeof parsed.top === "number"
    ) {
      return {
        left: parsed.left,
        top: parsed.top,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

function saveLogoPosition(position: LogoPosition | null) {
  if (typeof window === "undefined") return;

  if (!position) {
    window.localStorage.removeItem(LOGO_DRAG_KEY);
    return;
  }

  window.localStorage.setItem(LOGO_DRAG_KEY, JSON.stringify(position));
}

export function SiteHeader({
  cms = null,
  logoText: defaultLogoText = "FELORAL",
  accentColor = "#d6a84f",
  darkColor = "#070707",
}: Props) {
  const [liveCms, setLiveCms] = useState<CmsHomepageResponse | null>(cms);
  const [editorMode, setEditorMode] = useState(false);
  const [logoOverride, setLogoOverride] = useState("");
  const [logoPosition, setLogoPosition] = useState<LogoPosition | null>(null);

  const logoDragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  useEffect(() => {
    setLiveCms(cms);
  }, [cms]);

  useEffect(() => {
    setEditorMode(isEditorMode());

    const savedLogo = normalizeAssetUrl(window.localStorage.getItem(LOGO_IMAGE_OVERRIDE_KEY) || "");

    if (savedLogo && isImageUrl(savedLogo)) {
      setLogoOverride(savedLogo);
    }

    setLogoPosition(readLogoPosition());
  }, []);

  useEffect(() => {
    if (!editorMode) return;

    let stopped = false;

    const refreshCms = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/cms/public/homepage`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as CmsHomepageResponse;

        if (!stopped) {
          setLiveCms(payload);
        }
      } catch {
        // ignore
      }
    };

    const timer = window.setInterval(refreshCms, 1800);

    void refreshCms();

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [editorMode]);

  useEffect(() => {
    if (!editorMode) return;

    const originalFetch = window.fetch.bind(window);
    let active = true;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      try {
        const requestUrl = String(args[0] instanceof Request ? args[0].url : args[0]);
        const method =
          args[0] instanceof Request
            ? args[0].method
            : typeof args[1]?.method === "string"
              ? args[1].method
              : "GET";

        const selectedKey = selectedEditorKey();
        const requestIsLogo =
          requestUrl.includes(encodeURIComponent(LOGO_CMS_KEY)) ||
          requestUrl.includes(LOGO_CMS_KEY);

        if (/POST|PATCH|PUT/i.test(method) && (selectedKey === LOGO_CMS_KEY || requestIsLogo)) {
          response
            .clone()
            .json()
            .then((payload) => {
              if (!active) return;

              const uploadedImage = getImageFromUploadPayload(payload);

              if (!uploadedImage) return;

              window.localStorage.setItem(LOGO_IMAGE_OVERRIDE_KEY, uploadedImage);
              setLogoOverride(uploadedImage);
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }

      return response;
    };

    return () => {
      active = false;
      window.fetch = originalFetch;
    };
  }, [editorMode]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!logoDragRef.current) return;

      event.preventDefault();

      const next = {
        left: Math.max(0, Math.round(logoDragRef.current.startLeft + event.clientX - logoDragRef.current.startX)),
        top: Math.max(0, Math.round(logoDragRef.current.startTop + event.clientY - logoDragRef.current.startY)),
      };

      setLogoPosition(next);
    };

    const onPointerUp = () => {
      if (!logoDragRef.current) return;

      logoDragRef.current = null;

      setLogoPosition((current) => {
        saveLogoPosition(current);
        return current;
      });
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, []);

  const shippingNotice = getText(
    liveCms,
    "site.top.shippingNotice",
    "ارسال رایگان برای خریدهای بالای ۱,۵۰۰,۰۰۰ تومان",
  );

  const cartLabel = getText(liveCms, "site.header.cartLabel", "سبد خرید");
  const loginLabel = getText(liveCms, "site.header.loginLabel", "ورود / ثبت‌نام");
  const searchPlaceholder = getText(liveCms, "site.header.searchPlaceholder", "جستجوی محصول، برند یا دسته...");

  const logoTextValue = getText(liveCms, LOGO_CMS_KEY, defaultLogoText || "FELORAL");
  const logoImageFromImageField = normalizeAssetUrl(getImageUrl(liveCms, LOGO_CMS_KEY, ""));
  const logoImageFromTextField = isImageUrl(logoTextValue) ? normalizeAssetUrl(logoTextValue) : "";

  const logoImage = useMemo(() => {
    const possible = [logoOverride, logoImageFromImageField, logoImageFromTextField]
      .map(normalizeAssetUrl)
      .find((item) => item && isImageUrl(item));

    return possible || "";
  }, [logoOverride, logoImageFromImageField, logoImageFromTextField]);

  const logoAltText = logoImage ? defaultLogoText || "Feloral" : logoTextValue || "Feloral";

  const logoWrapperStyle: CSSProperties = logoPosition
    ? {
        position: "fixed",
        left: logoPosition.left,
        top: logoPosition.top,
        zIndex: editorMode ? 100020 : 80,
      }
    : {};

  const startLogoDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const logoEl = document.querySelector("[data-feloral-logo-wrapper='true']") as HTMLElement | null;
    const rect = logoEl?.getBoundingClientRect();

    logoDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: Math.round(rect?.left ?? window.innerWidth / 2),
      startTop: Math.round(rect?.top ?? 40),
    };
  };

  const resetLogoPosition = () => {
    setLogoPosition(null);
    saveLogoPosition(null);
  };

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
            const label = getText(liveCms, cmsKey, link.label);

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

          <div className="relative flex min-h-[90px] items-center justify-center">
            <div
              data-feloral-logo-wrapper="true"
              className="relative flex items-center justify-center"
              style={logoWrapperStyle}
            >
              <Link href="/" className="flex items-center justify-center gap-3">
                {logoImage ? (
                  <img
                    src={logoImage}
                    alt={logoAltText}
                    className="h-14 w-auto max-w-[220px] object-contain"
                    suppressHydrationWarning
                  />
                ) : (
                  <span className="text-2xl font-black tracking-[-0.04em] text-white">
                    <CmsEditMarker cmsKey={LOGO_CMS_KEY} sectionKey="site.logo" label="متن لوگو">
                      {logoTextValue}
                    </CmsEditMarker>
                  </span>
                )}
              </Link>

              {editorMode ? (
                <>
                  <button
                    type="button"
                    onPointerDown={startLogoDrag}
                    className="absolute -top-8 left-1/2 z-[100030] -translate-x-1/2 cursor-grab rounded-full border border-[#d6a84f]/70 bg-black/90 px-3 py-1 text-[11px] font-black text-[#f7e6bd] shadow-xl active:cursor-grabbing"
                  >
                    جابجایی لوگو
                  </button>

                  <button
                    type="button"
                    onClick={resetLogoPosition}
                    className="absolute -bottom-8 left-1/2 z-[100030] -translate-x-1/2 rounded-full border border-white/20 bg-black/80 px-3 py-1 text-[10px] font-bold text-white/80 shadow-xl"
                  >
                    ریست جای لوگو
                  </button>

                  <CmsImageEditButton
                    cmsKey={LOGO_CMS_KEY}
                    sectionKey="site.logo"
                    label="ویرایش عکس لوگو"
                    currentUrl={logoImage}
                    className="-right-9 -top-3 z-[100040]"
                  />
                </>
              ) : null}
            </div>
          </div>

          <nav data-feloral-header-nav="right" className="flex items-center justify-end gap-12 text-[15px] font-bold">
            {nav.map((item, index) => {
              const cmsKey = navKeyMap[item.href] || `site.nav.${index + 1}`;
              const label = getText(liveCms, cmsKey, item.label);

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
