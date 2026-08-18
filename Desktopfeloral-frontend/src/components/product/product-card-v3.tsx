"use client";

import { useEffect, useState } from "react";
import { Heart, ImageOff, ShoppingCart } from "lucide-react";

import { CmsEditMarker } from "@/components/cms/cms-edit-marker";
import { CmsImageEditButton } from "@/components/cms/cms-image-edit-button";

type Props = {
  name: string;
  type: string;
  price: string;
  badge: string;
  image: string;
  accentColor?: string;
  cmsKeyPrefix?: string;
};

export function ProductCardV3({
  name,
  type,
  price,
  badge,
  image,
  accentColor = "#d6a84f",
  cmsKeyPrefix,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setImageSrc(null);
      return;
    }

    const probe = new Image();

    probe.onload = () => {
      setImageSrc(image);
    };

    probe.onerror = () => {
      setImageSrc(null);
    };

    probe.src = image;

    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, [image]);

  const badgeNode = cmsKeyPrefix ? (
    <CmsEditMarker
      cmsKey={`${cmsKeyPrefix}.badge`}
      sectionKey="home.products"
    >
      {badge}
    </CmsEditMarker>
  ) : (
    badge
  );

  const nameNode = cmsKeyPrefix ? (
    <CmsEditMarker
      cmsKey={`${cmsKeyPrefix}.name`}
      sectionKey="home.products"
    >
      {name}
    </CmsEditMarker>
  ) : (
    name
  );

  const typeNode = cmsKeyPrefix ? (
    <CmsEditMarker
      cmsKey={`${cmsKeyPrefix}.type`}
      sectionKey="home.products"
    >
      {type}
    </CmsEditMarker>
  ) : (
    type
  );

  const priceNode = cmsKeyPrefix ? (
    <CmsEditMarker
      cmsKey={`${cmsKeyPrefix}.price`}
      sectionKey="home.products"
    >
      {price}
    </CmsEditMarker>
  ) : (
    price
  );

  return (
    <article className="group rounded-xl border border-black/8 bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_16px_45px_rgba(0,0,0,.12)]">
      <div className="relative grid h-[184px] place-items-center overflow-hidden rounded-lg bg-[#f8f5ef]">
        {cmsKeyPrefix ? (
          <CmsImageEditButton
            cmsKey={`${cmsKeyPrefix}.image`}
            sectionKey="home.products"
            label="ویرایش عکس"
            currentUrl={image}
            className="left-2 bottom-2"
          />
        ) : null}

        <button
          type="button"
          aria-label={`افزودن ${name} به علاقه‌مندی‌ها`}
          className="absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-black/9 bg-white text-black/70 transition hover:opacity-80"
        >
          <Heart size={17} />
        </button>

        <span
          className="absolute right-2 top-2 z-10 rounded-full bg-black px-3 py-1 text-[11px] font-bold"
          style={{ color: accentColor }}
        >
          {badgeNode}
        </span>

        {imageSrc ? (
          <img
            src={imageSrc}
            alt={name}
            className="real-product-img h-[172px] w-[90%] object-contain p-2 transition duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageSrc(null)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-black/30">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm">
              <ImageOff size={34} strokeWidth={1.4} />
            </div>

            <span className="text-xs font-medium">
              تصویر محصول موجود نیست
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <h3 className="min-h-[38px] text-[15px] font-bold leading-5 text-black">
          {nameNode}
        </h3>

        <p className="mt-1 text-xs font-medium text-black/45">
          {typeNode}
        </p>

        <p className="mt-3 text-[15px] font-black">
          {priceNode} تومان
        </p>
      </div>

      <button
        type="button"
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-black text-xs font-extrabold text-white transition hover:text-black"
        style={
          {
            "--hover-bg": accentColor,
          } as React.CSSProperties
        }
      >
        افزودن به سبد خرید
        <ShoppingCart size={16} />
      </button>
    </article>
  );
}