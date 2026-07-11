"use client";

export type CmsLocalStyle = {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: string;
  color?: string;
};

const STORAGE_PREFIX = "feloral_cms_style:";

export function getCmsLocalStyle(key: string): CmsLocalStyle {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCmsLocalStyle(key: string, style: CmsLocalStyle) {
  if (typeof window === "undefined") return;

  const cleanStyle: CmsLocalStyle = {};

  if (style.fontFamily) cleanStyle.fontFamily = style.fontFamily;
  if (style.fontWeight) cleanStyle.fontWeight = style.fontWeight;
  if (style.fontSize) cleanStyle.fontSize = style.fontSize;
  if (style.color) cleanStyle.color = style.color;

  if (Object.keys(cleanStyle).length === 0) {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } else {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(cleanStyle));
  }

  window.dispatchEvent(new CustomEvent("feloral-cms-local-style", { detail: { key, style: cleanStyle } }));
}
