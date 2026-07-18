"use client";

import { canUseCmsEditor } from "@/lib/cms-editor-access";
import { adminFetch } from "@/lib/admin-fetch";

import { useEffect } from "react";

type Candidate = {
  key: string;
  value: string;
  score: number;
};

const STORAGE_KEY = "feloral.hero.background.url.v5";
const OLD_STORAGE_KEYS = [
  "feloral.hero.background.url.v3",
  "feloral.hero.background.url.v4",
];
const DELETE_KEYS = [
  "feloral.hero.background.deleted.v4",
  "feloral.hero.background.deleted.v5",
];

const COMMON_KEYS = [
  "home.hero.background",
  "home.hero.backgroundImage",
  "home.hero.backgroundUrl",
  "home.hero.bgImage",
  "home.hero.bgUrl",
  "home.hero.image",
  "home.hero.imageUrl",
  "home.hero.banner",
  "home.hero.bannerImage",
  "home.hero.media",
  "hero.background",
  "hero.backgroundImage",
  "hero.backgroundUrl",
  "hero.image",
  "hero.imageUrl",
];

function isEditorMode() {
  if (typeof window === "undefined") return false;
  return canUseCmsEditor();
}

function apiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return (envBase || "http://localhost:3000").replace(/\/$/, "");
}

function normalizeUrl(value: string) {
  if (!value) return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) return `${apiBase()}${trimmed}`;

  if (/^(uploads|media|files|static)\//i.test(trimmed)) return `${apiBase()}/${trimmed}`;

  return trimmed;
}

function looksLikeImageUrl(value: string) {
  const v = String(value || "").toLowerCase();

  return (
    v.startsWith("data:image/") ||
    v.startsWith("blob:") ||
    v.includes("/uploads/") ||
    v.includes("/media/") ||
    v.includes("/files/") ||
    v.includes("image/upload") ||
    /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(v)
  );
}

function scorePath(path: string, value: string) {
  const p = String(path || "").toLowerCase();
  let score = 0;

  if (p.includes("hero")) score += 60;
  if (p.includes("home")) score += 16;
  if (p.includes("background") || p.includes("bg")) score += 55;
  if (p.includes("banner")) score += 34;
  if (p.includes("image") || p.includes("imageurl") || p.includes("media") || p.includes("photo") || p.includes("url")) score += 22;
  if (looksLikeImageUrl(value)) score += 40;

  if (p.includes("logo") || p.includes("icon") || p.includes("avatar") || p.includes("thumbnail")) score -= 90;

  return score;
}

function collectCandidates(data: unknown, allowLoose = false) {
  const out: Candidate[] = [];

  function add(path: string, rawValue: string) {
    const value = normalizeUrl(rawValue);
    if (!value || !looksLikeImageUrl(value)) return;

    const score = scorePath(path, value);
    if (allowLoose || score >= 45) out.push({ key: path, value, score });
  }

  function walk(node: unknown, path: string) {
    if (!node) return;

    if (typeof node === "string") {
      add(path, node);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}.${index}`));
      return;
    }

    if (typeof node === "object") {
      const record = node as Record<string, unknown>;

      const explicitKey =
        (typeof record.key === "string" ? record.key : "") ||
        (typeof record.cmsKey === "string" ? record.cmsKey : "") ||
        (typeof record.name === "string" ? record.name : "");

      const maybeValues = [
        record.value,
        record.url,
        record.src,
        record.path,
        record.mediaUrl,
        record.imageUrl,
        record.backgroundImage,
        record.backgroundUrl,
        record.fileUrl,
        record.content,
        record.text,
      ];

      if (explicitKey) {
        for (const item of maybeValues) {
          if (typeof item === "string") add(explicitKey, item);
        }
      }

      for (const [key, value] of Object.entries(record)) {
        const nextPath = explicitKey && key === "value" ? explicitKey : path ? `${path}.${key}` : key;
        walk(value, nextPath);
      }
    }
  }

  walk(data, "");

  const unique = new Map<string, Candidate>();
  for (const item of out) {
    const mapKey = `${item.key}:${item.value}`;
    const current = unique.get(mapKey);
    if (!current || item.score > current.score) unique.set(mapKey, item);
  }

  return Array.from(unique.values()).sort((a, b) => b.score - a.score);
}

function unhideEverythingPreviouslyHidden() {
  document.querySelectorAll("[data-feloral-hero-visual-hidden='true']").forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("opacity");
    delete el.dataset.feloralHeroVisualHidden;
  });
}

function climbToHeroBox(el: HTMLElement | null) {
  if (!el || el.closest("header")) return null;

  const section = el.closest("section") as HTMLElement | null;
  if (section && !section.closest("header")) return section;

  let current: HTMLElement | null = el;

  for (let i = 0; i < 8 && current?.parentElement; i += 1) {
    const parent = current.parentElement as HTMLElement;
    if (parent.closest("header")) return null;

    const rect = parent.getBoundingClientRect();
    if (rect.width > 700 && rect.height > 280) return parent;

    current = parent;
  }

  return el;
}

function heroElement() {
  const selectors = [
    '[data-feloral-hero="true"]',
    '[data-feloral-hero]',
    '[data-section-key="home.hero"]',
    '[data-cms-section-key="home.hero"]',
    '[data-feloral-section="home.hero"]',
    '[data-cms-key*="home.hero"]',
    '[data-feloral-cms-key*="home.hero"]',
    '[data-cms-key*="hero"]',
    '[data-feloral-cms-key*="hero"]',
  ];

  for (const selector of selectors) {
    try {
      const found = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      for (const el of found) {
        const real = climbToHeroBox(el);
        if (real) return real;
      }
    } catch {
      // ignore unsupported selectors
    }
  }

  const sections = (Array.from(document.querySelectorAll("main section, section")) as HTMLElement[])
    .filter((el) => !el.closest("header"))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 700 && rect.height > 280 && rect.top < window.innerHeight * 1.3;
    });

  return sections[0] || null;
}

function ensureLayer(hero: HTMLElement) {
  let layer = hero.querySelector('[data-feloral-hero-bg-layer="true"]') as HTMLElement | null;

  if (!layer) {
    layer = document.createElement("div");
    layer.dataset.feloralHeroBgLayer = "true";
    hero.insertBefore(layer, hero.firstChild);
  }

  hero.dataset.feloralHeroResolvedBox = "true";
  hero.style.setProperty("position", "relative", "important");
  hero.style.setProperty("overflow", "hidden", "important");

  layer.style.setProperty("position", "absolute", "important");
  layer.style.setProperty("inset", "0", "important");
  layer.style.setProperty("z-index", "0", "important");
  layer.style.setProperty("pointer-events", "none", "important");
  layer.style.setProperty("background-size", "cover", "important");
  layer.style.setProperty("background-position", "center", "important");
  layer.style.setProperty("background-repeat", "no-repeat", "important");

  Array.from(hero.children).forEach((child) => {
    if (child === layer) return;
    const element = child as HTMLElement;
    const position = window.getComputedStyle(element).position;
    if (position === "static") element.style.setProperty("position", "relative", "important");
    element.style.setProperty("z-index", "1", "important");
  });

  return layer;
}

function applyHeroBackground(rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  const hero = heroElement();

  if (!hero || !url) return false;

  unhideEverythingPreviouslyHidden();

  const layer = ensureLayer(hero);
  const bg = `linear-gradient(90deg, rgba(8,7,6,.56), rgba(8,7,6,.16)), url("${url}")`;

  layer.style.setProperty("background-image", bg, "important");

  hero.style.setProperty("background-image", bg, "important");
  hero.style.setProperty("background-size", "cover", "important");
  hero.style.setProperty("background-position", "center", "important");
  hero.style.setProperty("background-repeat", "no-repeat", "important");

  if (hero.offsetHeight < 420) hero.style.setProperty("min-height", "520px", "important");

  window.localStorage.setItem(STORAGE_KEY, url);
  DELETE_KEYS.forEach((key) => window.localStorage.removeItem(key));

  return true;
}

function clearHeroVisual() {
  window.localStorage.removeItem(STORAGE_KEY);
  OLD_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem("feloral.hero.background.deleted.v5", "1");

  document.querySelectorAll('[data-feloral-hero-bg-layer="true"]').forEach((node) => node.remove());

  const hero = heroElement();
  if (!hero) return;

  hero.style.removeProperty("background-image");
  hero.style.removeProperty("background-size");
  hero.style.removeProperty("background-position");
  hero.style.removeProperty("background-repeat");

  unhideEverythingPreviouslyHidden();
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAllCmsCandidates() {
  const base = apiBase();

  const urls = [
    `${base}/cms/public/homepage`,
    `${base}/cms/public/theme`,
  ];

  const candidates: Candidate[] = [];

  for (const url of urls) {
    const json = await fetchJson(url);
    if (!json) continue;
    candidates.push(...collectCandidates(json));
  }

  return candidates.sort((a, b) => b.score - a.score);
}

async function patchContentKey(key: string, value: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const safeKey = encodeURIComponent(key);
  const bodies = [
    { value },
    { content: value },
    { text: value },
    { mediaUrl: value },
    { imageUrl: value },
    { url: value },
  ];

  for (const body of bodies) {
    try {
      const res = await adminFetch(`/api/admin/cms/contents/${safeKey}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) return true;
    } catch {
      // try next body
    }
  }

  return false;
}

async function deleteHeroBackground() {
  const found = await fetchAllCmsCandidates();
  const keys = Array.from(new Set([...found.map((item) => item.key), ...COMMON_KEYS]));

  let ok = false;

  for (const key of keys) {
    if (!/hero/i.test(key) || !/(background|bg|image|banner|media|photo|url)/i.test(key)) continue;
    ok = (await patchContentKey(key, "")) || ok;
  }

  clearHeroVisual();

  if (ok) window.alert("عکس پس‌زمینه هیرو حذف شد.");
  else window.alert("عکس از صفحه حذف شد، اما ذخیره در CMS انجام نشد.");
}

function removeInlineDeleteButtons() {
  document.querySelectorAll("[data-feloral-delete-hero-bg-inline='true'], [data-feloral-delete-wrapper='true']").forEach((node) => node.remove());

  Array.from(document.querySelectorAll("button")).forEach((button) => {
    const text = (button.textContent || "").trim();
    if (text === "حذف عکس" && !button.hasAttribute("data-feloral-delete-hero-bg")) {
      const parent = button.parentElement;
      button.remove();
      if (parent?.hasAttribute("data-feloral-delete-wrapper")) parent.remove();
    }
  });
}

function makeFloatingDeleteButton() {
  if (!isEditorMode()) return;

  removeInlineDeleteButtons();

  if (document.querySelector("[data-feloral-delete-hero-bg='true']")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.feloralDeleteHeroBg = "true";
  button.textContent = "حذف عکس هیرو";
  button.style.position = "fixed";
  button.style.left = "18px";
  button.style.bottom = "68px";
  button.style.zIndex = "99999";
  button.style.padding = "10px 14px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid rgba(255,90,90,.65)";
  button.style.background = "rgba(80,18,18,.92)";
  button.style.color = "#ffecec";
  button.style.fontSize = "12px";
  button.style.fontWeight = "900";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
  button.onclick = () => void deleteHeroBackground();

  document.body.appendChild(button);
}

function extractImageFromResponse(data: unknown) {
  const all = collectCandidates(data, true).sort((a, b) => b.score - a.score);
  return all[0]?.value || "";
}

function installFetchInterceptor() {
  const win = window as typeof window & { __feloralHeroBgFetchPatchedV5?: boolean };
  if (win.__feloralHeroBgFetchPatchedV5) return;
  win.__feloralHeroBgFetchPatchedV5 = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const url = String(args[0] instanceof Request ? args[0].url : args[0]);
      const method =
        args[0] instanceof Request
          ? args[0].method
          : typeof args[1]?.method === "string"
            ? args[1].method
            : "GET";

      const likelyUploadOrCms =
        /cms\/admin\/media\/upload|upload|media-url|contents|sections|homepage/i.test(url) &&
        /POST|PATCH|PUT/i.test(method);

      if (likelyUploadOrCms) {
        response
          .clone()
          .json()
          .then((data) => {
            const image = extractImageFromResponse(data);
            if (image && isEditorMode()) applyHeroBackground(image);
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }

    return response;
  };
}

export function HeroBackgroundRuntime() {
  useEffect(() => {
    let stopped = false;

    installFetchInterceptor();
    unhideEverythingPreviouslyHidden();

    // migrate the old saved image if it exists and not deleted
    const deleted = DELETE_KEYS.some((key) => window.localStorage.getItem(key) === "1");
    const saved = window.localStorage.getItem(STORAGE_KEY) || OLD_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) || "";

    if (saved && !deleted) {
      window.setTimeout(() => applyHeroBackground(saved), 100);
      window.setTimeout(() => applyHeroBackground(saved), 900);
    }

    const refresh = async () => {
      if (stopped) return;

      makeFloatingDeleteButton();
      removeInlineDeleteButtons();
      unhideEverythingPreviouslyHidden();

      if (DELETE_KEYS.some((key) => window.localStorage.getItem(key) === "1")) {
        return;
      }

      const latestSaved = window.localStorage.getItem(STORAGE_KEY);
      if (latestSaved) {
        applyHeroBackground(latestSaved);
        return;
      }

      const candidates = await fetchAllCmsCandidates();
      if (stopped) return;

      const best = candidates[0];
      if (best?.value) applyHeroBackground(best.value);
    };

    void refresh();

    const interval = window.setInterval(() => {
      if (isEditorMode()) void refresh();
    }, 1800);

    const observer = new MutationObserver(() => {
      makeFloatingDeleteButton();
      removeInlineDeleteButtons();
      unhideEverythingPreviouslyHidden();

      if (DELETE_KEYS.some((key) => window.localStorage.getItem(key) === "1")) return;

      const savedUrl = window.localStorage.getItem(STORAGE_KEY);
      if (savedUrl) applyHeroBackground(savedUrl);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopped = true;
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return null;
}

