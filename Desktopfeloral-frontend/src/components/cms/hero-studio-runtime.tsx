"use client";

import { canUseCmsEditor } from "@/lib/cms-editor-access";

import { useEffect } from "react";

type Candidate = { key: string; value: string; score: number };
type SavedPosition = { left: number; top: number; width?: number };
type SavedMap = Record<string, SavedPosition>;

const BG_KEY = "feloral.hero.studio.background.v1";
const BG_LIST_KEY = "feloral.hero.studio.background.list.v1";
const BG_INDEX_KEY = "feloral.hero.studio.background.index.v1";
const DELETED_KEY = "feloral.hero.studio.background.deleted.v1";
const DRAG_KEY = "feloral.hero.studio.drag.v1";

const OLD_BG_KEYS = [
  "feloral.hero.background.url.v3",
  "feloral.hero.background.url.v4",
  "feloral.hero.background.url.v5",
];

const OLD_DELETE_KEYS = [
  "feloral.hero.background.deleted.v4",
  "feloral.hero.background.deleted.v5",
];

const HERO_TEXT_KEYS = [
  { id: "eyebrow", key: "home.hero.eyebrow", label: "Ø¨Ø§Ù„Ø§Ù†ÙˆÛŒØ³ Ù‡ÛŒØ±Ùˆ" },
  { id: "title", key: "home.hero.title", label: "Ø¹Ù†ÙˆØ§Ù† Ù‡ÛŒØ±Ùˆ" },
  { id: "subtitle", key: "home.hero.subtitle", label: "Ø²ÛŒØ±Ø¹Ù†ÙˆØ§Ù† Ù‡ÛŒØ±Ùˆ" },
  { id: "cta", key: "home.hero.cta", label: "Ø¯Ú©Ù…Ù‡ Ù‡ÛŒØ±Ùˆ" },
];

const COMMON_BG_KEYS = [
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

function editorMode() {
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
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("/")) return `${apiBase()}${trimmed}`;
  if (/^(uploads|media|files|static)\//i.test(trimmed)) return `${apiBase()}/${trimmed}`;
  return trimmed;
}

function looksImage(value: string) {
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
  if (p.includes("hero")) score += 70;
  if (p.includes("home")) score += 18;
  if (p.includes("background") || p.includes("bg")) score += 55;
  if (p.includes("banner")) score += 35;
  if (p.includes("image") || p.includes("imageurl") || p.includes("media") || p.includes("photo") || p.includes("url")) score += 22;
  if (looksImage(value)) score += 40;
  if (p.includes("logo") || p.includes("icon") || p.includes("avatar") || p.includes("thumbnail")) score -= 100;
  return score;
}

function collectCandidates(data: unknown, allowLoose = false) {
  const out: Candidate[] = [];

  function add(path: string, rawValue: string) {
    const value = normalizeUrl(rawValue);
    if (!value || !looksImage(value)) return;
    const score = scorePath(path, value);
    if (allowLoose || score >= 55) out.push({ key: path, value, score });
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

function collectTextMap(data: unknown) {
  const map = new Map<string, string>();

  function set(key: string, value: unknown) {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || looksImage(trimmed)) return;
    map.set(key, trimmed);
  }

  function walk(node: unknown, path: string) {
    if (!node) return;

    if (typeof node === "string") {
      set(path, node);
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

      if (explicitKey) {
        set(explicitKey, record.value);
        set(explicitKey, record.text);
        set(explicitKey, record.content);
        set(explicitKey, record.label);
      }

      for (const [key, value] of Object.entries(record)) {
        const nextPath = explicitKey && key === "value" ? explicitKey : path ? `${path}.${key}` : key;
        walk(value, nextPath);
      }
    }
  }

  walk(data, "");
  return map;
}

function readSavedPositions(): SavedMap {
  try {
    return JSON.parse(window.localStorage.getItem(DRAG_KEY) || "{}") as SavedMap;
  } catch {
    return {};
  }
}

function writeSavedPositions(value: SavedMap) {
  window.localStorage.setItem(DRAG_KEY, JSON.stringify(value));
}

function readImageList() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BG_LIST_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => normalizeUrl(String(x || ""))).filter((x) => x && looksImage(x));
  } catch {
    return [];
  }
}

function writeImageList(list: string[]) {
  const clean = Array.from(new Set(list.map(normalizeUrl).filter((x) => x && looksImage(x))));
  window.localStorage.setItem(BG_LIST_KEY, JSON.stringify(clean));
  return clean;
}

function addImageToList(url: string) {
  const normalized = normalizeUrl(url);
  if (!normalized || !looksImage(normalized)) return readImageList();
  const list = writeImageList([normalized, ...readImageList()]);
  window.localStorage.setItem(BG_INDEX_KEY, "0");
  return list;
}

function setImportant(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value, "important");
}

function unhideOldDamage() {
  document.querySelectorAll("[data-feloral-hero-visual-hidden='true']").forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("opacity");
    delete el.dataset.feloralHeroVisualHidden;
  });
}

async function fetchJson(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function tokenFromStorage(silent = true) {
  const keys = Object.keys(window.localStorage);
  const priority = keys.filter((key) => /cms|admin|access|token|auth/i.test(key));
  const all = [...priority, ...keys.filter((key) => !priority.includes(key))];

  for (const key of all) {
    const value = window.localStorage.getItem(key) || "";
    if (!value) continue;
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) return value;

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string" && parsed.includes(".")) return parsed;
      if (parsed?.accessToken) return String(parsed.accessToken);
      if (parsed?.token) return String(parsed.token);
      if (parsed?.access_token) return String(parsed.access_token);
    } catch {}
  }

  if (silent) return "";
  return window.prompt("Access Token Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†:") || "";
}

async function fetchCmsData() {
  const token = tokenFromStorage(true);
  const base = apiBase();
  const urls = [
    `${base}/cms/public/homepage`,
    `${base}/cms/public/theme`,
    `${base}/cms/admin/homepage`,
    `${base}/cms/admin/contents`,
    `${base}/cms/admin/sections`,
    `${base}/cms/admin/theme`,
  ];

  const results: unknown[] = [];
  for (const url of urls) {
    const json = await fetchJson(url, token);
    if (json) results.push(json);
  }
  return results;
}

function elementVisible(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function bestTextElementByValue(value: string, prefer: string) {
  if (!value || value.length < 2) return null;
  const exact = value.replace(/\s+/g, " ").trim();
  const scope = document.querySelector("main") || document.body;
  const candidates = Array.from(scope.querySelectorAll("a,button,h1,h2,h3,p,span,div")) as HTMLElement[];

  const scored = candidates
    .filter((el) => elementVisible(el))
    .map((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return null;

      let score = 0;
      if (text === exact) score += 90;
      else if (text.includes(exact)) score += 45;
      else if (exact.includes(text) && text.length > 3) score += 20;
      else return null;

      const tag = el.tagName.toLowerCase();
      const cls = String(el.className || "");

      if (prefer === "title" && /^h[1-3]$/.test(tag)) score += 40;
      if (prefer === "cta" && (tag === "a" || tag === "button")) score += 40;
      if (prefer === "subtitle" && (tag === "p" || tag === "span" || tag === "div")) score += 18;
      if (prefer === "eyebrow" && (tag === "span" || tag === "div" || tag === "p")) score += 18;
      if (/hero|cms|edit/i.test(cls)) score += 16;

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) score += 20;
      if (rect.top < 80) score -= 35;
      if (el.closest("header")) score -= 200;
      score -= Math.min(20, rect.width / 300);

      return { el, score };
    })
    .filter(Boolean) as Array<{ el: HTMLElement; score: number }>;

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.el || null;
}

function elementByCmsKey(key: string) {
  const selectors = [
    `[data-cms-key="${CSS.escape(key)}"]`,
    `[data-feloral-cms-key="${CSS.escape(key)}"]`,
    `[data-edit-key="${CSS.escape(key)}"]`,
    `[data-key="${CSS.escape(key)}"]`,
  ];

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el && !el.closest("header")) return el;
    } catch {}
  }
  return null;
}

function findHeroTextTargets(textMap: Map<string, string>) {
  return HERO_TEXT_KEYS.map((item) => {
    const value = textMap.get(item.key) || "";
    const direct = elementByCmsKey(item.key);
    const byText = direct || bestTextElementByValue(value, item.id);
    return { ...item, value, el: byText };
  }).filter((x) => Boolean(x.el)) as Array<{ id: string; key: string; label: string; value: string; el: HTMLElement }>;
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
    if (rect.width > 700 && rect.height > 260) return parent;
    current = parent;
  }
  return el;
}

function heroElement(targets?: Array<{ el: HTMLElement }>) {
  if (targets?.length) {
    for (const item of targets) {
      const real = climbToHeroBox(item.el);
      if (real) return real;
    }
  }

  const marked = Array.from(
    document.querySelectorAll('[data-feloral-hero="true"],[data-section-key="home.hero"],[data-cms-section-key="home.hero"],[data-feloral-section="home.hero"]')
  ) as HTMLElement[];

  for (const el of marked) {
    const real = climbToHeroBox(el);
    if (real) return real;
  }

  const sections = (Array.from(document.querySelectorAll("main section, section")) as HTMLElement[])
    .filter((el) => !el.closest("header"))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 700 && rect.height > 260 && rect.top < window.innerHeight * 1.25;
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
  setImportant(hero, "position", "relative");
  setImportant(hero, "overflow", "hidden");

  setImportant(layer, "position", "absolute");
  setImportant(layer, "inset", "0");
  setImportant(layer, "z-index", "0");
  setImportant(layer, "pointer-events", "none");
  setImportant(layer, "background-size", "cover");
  setImportant(layer, "background-position", "center");
  setImportant(layer, "background-repeat", "no-repeat");

  Array.from(hero.children).forEach((child) => {
    if (child === layer) return;
    const element = child as HTMLElement;
    const position = window.getComputedStyle(element).position;
    if (position === "static") setImportant(element, "position", "relative");
    setImportant(element, "z-index", "1");
  });

  return layer;
}

function hideDuplicateImageOutsideHero(url: string, hero: HTMLElement) {
  const normalized = normalizeUrl(url);
  const fileName = normalized.split("?")[0].split("/").pop() || "";
  if (!fileName && !normalized) return;

  const imgs = Array.from(document.querySelectorAll("main img, section img")) as HTMLImageElement[];

  imgs.forEach((img) => {
    if (hero.contains(img)) return;
    const src = normalizeUrl(img.currentSrc || img.src || "");
    if (!src) return;

    const same = src === normalized || (fileName && src.includes(fileName)) || (fileName && decodeURIComponent(src).includes(decodeURIComponent(fileName)));
    if (!same) return;

    const rect = img.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const nearHero = rect.top >= heroRect.top - 50 && rect.top <= heroRect.bottom + 700;
    if (!nearHero) return;

    img.dataset.feloralHeroVisualHidden = "true";
    setImportant(img, "display", "none");

    let parent = img.parentElement as HTMLElement | null;
    for (let i = 0; i < 2 && parent && parent !== hero; i += 1) {
      const text = (parent.textContent || "").replace(/\s+/g, "").trim();
      const parentImgs = parent.querySelectorAll("img").length;
      if (!text && parentImgs <= 2) {
        parent.dataset.feloralHeroVisualHidden = "true";
        setImportant(parent, "display", "none");
      }
      parent = parent.parentElement as HTMLElement | null;
    }
  });
}

function applyHeroBackground(url: string, targets?: Array<{ el: HTMLElement }>) {
  const normalized = normalizeUrl(url);
  const hero = heroElement(targets);
  if (!hero || !normalized) return false;

  unhideOldDamage();

  const layer = ensureLayer(hero);
  const bg = `linear-gradient(90deg, rgba(8,7,6,.56), rgba(8,7,6,.16)), url("${normalized}")`;

  setImportant(layer, "background-image", bg);
  setImportant(hero, "background-image", bg);
  setImportant(hero, "background-size", "cover");
  setImportant(hero, "background-position", "center");
  setImportant(hero, "background-repeat", "no-repeat");

  if (hero.offsetHeight < 420) setImportant(hero, "min-height", "520px");

  window.localStorage.setItem(BG_KEY, normalized);
  OLD_DELETE_KEYS.concat([DELETED_KEY]).forEach((key) => window.localStorage.removeItem(key));
  addImageToList(normalized);
  hideDuplicateImageOutsideHero(normalized, hero);
  return true;
}

function clearHeroBackground(targets?: Array<{ el: HTMLElement }>) {
  window.localStorage.removeItem(BG_KEY);
  OLD_BG_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(DELETED_KEY, "1");
  document.querySelectorAll('[data-feloral-hero-bg-layer="true"]').forEach((node) => node.remove());

  const hero = heroElement(targets);
  if (hero) {
    hero.style.removeProperty("background-image");
    hero.style.removeProperty("background-size");
    hero.style.removeProperty("background-position");
    hero.style.removeProperty("background-repeat");
  }
  unhideOldDamage();
}

async function patchContentKey(key: string, value: string) {
  const token = tokenFromStorage(false);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const safeKey = encodeURIComponent(key);
  const bodies = [{ value }, { content: value }, { text: value }, { mediaUrl: value }, { imageUrl: value }, { url: value }];

  for (const body of bodies) {
    try {
      const res = await fetch(`${apiBase()}/cms/admin/contents/${safeKey}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (res.ok) return true;
    } catch {}
  }
  return false;
}

async function deleteHeroBackground(targets?: Array<{ el: HTMLElement }>) {
  const cms = await fetchCmsData();
  const found = cms.flatMap((item) => collectCandidates(item));
  const keys = Array.from(new Set([...found.map((item) => item.key), ...COMMON_BG_KEYS]));
  let ok = false;

  for (const key of keys) {
    if (!/hero/i.test(key) || !/(background|bg|image|banner|media|photo|url)/i.test(key)) continue;
    ok = (await patchContentKey(key, "")) || ok;
  }

  clearHeroBackground(targets);
  if (ok) window.alert("Ø¹Ú©Ø³ Ù¾Ø³â€ŒØ²Ù…ÛŒÙ†Ù‡ Ù‡ÛŒØ±Ùˆ Ø­Ø°Ù Ø´Ø¯.");
  else window.alert("Ø¹Ú©Ø³ Ø§Ø² ØµÙØ­Ù‡ Ø­Ø°Ù Ø´Ø¯. Ø§Ú¯Ø± Ø¨Ø¹Ø¯ Ø§Ø² Ø±ÙØ±Ø´ Ø¨Ø±Ú¯Ø´ØªØŒ ÛŒÚ©â€ŒØ¨Ø§Ø± Access Token Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†.");
}

function removeOldButtons() {
  document.querySelectorAll(
    "[data-feloral-delete-hero-bg-inline='true'],[data-feloral-delete-wrapper='true'],[data-feloral-hero-nav='true'],[data-feloral-hero-drag-handle='true']"
  ).forEach((node) => node.remove());

  Array.from(document.querySelectorAll("button")).forEach((button) => {
    const text = (button.textContent || "").trim();
    if (text === "Ø­Ø°Ù Ø¹Ú©Ø³" && !button.hasAttribute("data-feloral-delete-hero-bg")) button.remove();
  });
}

function makeFloatingDelete(targets?: Array<{ el: HTMLElement }>) {
  if (!editorMode()) return;
  if (document.querySelector("[data-feloral-delete-hero-bg='true']")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.feloralDeleteHeroBg = "true";
  button.textContent = "Ø­Ø°Ù Ø¹Ú©Ø³ Ù‡ÛŒØ±Ùˆ";
  setImportant(button, "position", "fixed");
  setImportant(button, "left", "18px");
  setImportant(button, "bottom", "68px");
  setImportant(button, "z-index", "99999");
  button.style.padding = "10px 14px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid rgba(255,90,90,.65)";
  button.style.background = "rgba(80,18,18,.92)";
  button.style.color = "#ffecec";
  button.style.fontSize = "12px";
  button.style.fontWeight = "900";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
  button.onclick = () => void deleteHeroBackground(targets);
  document.body.appendChild(button);
}

function extractImageFromResponse(data: unknown) {
  const all = collectCandidates(data, true).sort((a, b) => b.score - a.score);
  return all[0]?.value || "";
}

function installFetchInterceptor(getTargets: () => Array<{ el: HTMLElement }>) {
  const win = window as typeof window & { __feloralHeroStudioFetchV1?: boolean };
  if (win.__feloralHeroStudioFetchV1) return;
  win.__feloralHeroStudioFetchV1 = true;

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

      const likelyUploadOrCms = /cms\/admin\/media\/upload|upload|media-url|contents|sections|homepage/i.test(url) && /POST|PATCH|PUT/i.test(method);

      if (likelyUploadOrCms) {
        response.clone().json().then((data) => {
          const image = extractImageFromResponse(data);
          if (image && editorMode()) applyHeroBackground(image, getTargets());
        }).catch(() => {});
      }
    } catch {}

    return response;
  };
}

function applyDragPosition(el: HTMLElement, pos: SavedPosition) {
  setImportant(el, "position", "fixed");
  setImportant(el, "left", `${pos.left}px`);
  setImportant(el, "top", `${pos.top}px`);
  setImportant(el, "right", "auto");
  setImportant(el, "bottom", "auto");
  setImportant(el, "margin", "0");
  setImportant(el, "transform", "none");
  setImportant(el, "z-index", "99982");
  setImportant(el, "max-width", "min(760px, calc(100vw - 36px))");
  if (pos.width && pos.width > 20) setImportant(el, "width", `${pos.width}px`);
}

function makeHeroDragHandles(targets: Array<{ id: string; key: string; label: string; value: string; el: HTMLElement }>) {
  if (!editorMode()) return;
  const saved = readSavedPositions();

  for (const target of targets) {
    const el = target.el;
    const savedPosition = saved[target.id];
    if (savedPosition) applyDragPosition(el, savedPosition);

    if (document.querySelector(`[data-feloral-hero-drag-handle-id="${target.id}"]`)) continue;

    const handle = document.createElement("button");
    handle.type = "button";
    handle.dataset.feloralHeroDragHandle = "true";
    handle.dataset.feloralHeroDragHandleId = target.id;
    handle.textContent = `Ø¬Ø§Ø¨Ø¬Ø§ÛŒÛŒ ${target.label}`;
    setImportant(handle, "position", "fixed");
    setImportant(handle, "z-index", "100005");
    handle.style.padding = "6px 9px";
    handle.style.borderRadius = "999px";
    handle.style.border = "1px solid rgba(214,168,79,.75)";
    handle.style.background = "rgba(15,15,18,.94)";
    handle.style.color = "#f7e6bd";
    handle.style.fontSize = "11px";
    handle.style.fontWeight = "900";
    handle.style.cursor = "grab";
    handle.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
    handle.style.userSelect = "none";
    handle.style.touchAction = "none";

    const place = () => {
      const rect = el.getBoundingClientRect();
      handle.style.left = `${Math.max(6, Math.round(rect.left))}px`;
      handle.style.top = `${Math.max(6, Math.round(rect.top - 30))}px`;
    };
    place();

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = el.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;

      applyDragPosition(el, { left: Math.round(startLeft), top: Math.round(startTop), width: Math.round(rect.width) });
      el.style.outline = "2px solid rgba(214,168,79,.95)";
      el.style.outlineOffset = "4px";
      handle.style.cursor = "grabbing";

      const move = (e: PointerEvent) => {
        e.preventDefault();
        const left = Math.max(0, Math.round(startLeft + e.clientX - startX));
        const top = Math.max(0, Math.round(startTop + e.clientY - startY));
        setImportant(el, "left", `${left}px`);
        setImportant(el, "top", `${top}px`);
        handle.style.left = `${Math.max(6, left)}px`;
        handle.style.top = `${Math.max(6, top - 30)}px`;
      };

      const up = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);

        const finalRect = el.getBoundingClientRect();
        const latest = readSavedPositions();
        latest[target.id] = {
          left: Math.max(0, Math.round(finalRect.left)),
          top: Math.max(0, Math.round(finalRect.top)),
          width: Math.round(finalRect.width),
        };
        writeSavedPositions(latest);

        el.style.outline = "1px dashed rgba(214,168,79,.45)";
        el.style.outlineOffset = "4px";
        handle.style.cursor = "grab";
        place();
      };

      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
    };

    handle.addEventListener("pointerdown", down, true);
    document.body.appendChild(handle);
    window.setInterval(place, 700);
  }
}

function applySavedHeroTextPositions(targets: Array<{ id: string; el: HTMLElement }>) {
  const saved = readSavedPositions();
  for (const target of targets) {
    if (saved[target.id]) applyDragPosition(target.el, saved[target.id]);
  }
}

function cycleHeroImage(step: number, targets?: Array<{ el: HTMLElement }>) {
  const list = readImageList();
  if (!list.length) return;
  const current = Number(window.localStorage.getItem(BG_INDEX_KEY) || "0") || 0;
  const next = (current + step + list.length) % list.length;
  window.localStorage.setItem(BG_INDEX_KEY, String(next));
  applyHeroBackground(list[next], targets);
}

function makeHeroNavigation(targets?: Array<{ el: HTMLElement }>) {
  const hero = heroElement(targets);
  if (!hero || document.querySelector("[data-feloral-hero-nav='true']")) return;

  const nav = document.createElement("div");
  nav.dataset.feloralHeroNav = "true";
  setImportant(nav, "position", "absolute");
  setImportant(nav, "right", "22px");
  setImportant(nav, "bottom", "22px");
  setImportant(nav, "z-index", "25");
  nav.style.display = "flex";
  nav.style.gap = "8px";

  const prev = document.createElement("button");
  const next = document.createElement("button");

  for (const btn of [prev, next]) {
    btn.type = "button";
    btn.style.width = "38px";
    btn.style.height = "38px";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(255,255,255,.35)";
    btn.style.background = "rgba(10,10,12,.45)";
    btn.style.color = "white";
    btn.style.fontSize = "20px";
    btn.style.fontWeight = "900";
    btn.style.cursor = "pointer";
    btn.style.backdropFilter = "blur(10px)";
  }

  prev.textContent = "â€¹";
  next.textContent = "â€º";
  prev.title = "Ø¹Ú©Ø³ Ù‚Ø¨Ù„ÛŒ";
  next.title = "Ø¹Ú©Ø³ Ø¨Ø¹Ø¯ÛŒ";

  prev.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    cycleHeroImage(-1, targets);
  };

  next.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    cycleHeroImage(1, targets);
  };

  nav.appendChild(prev);
  nav.appendChild(next);
  hero.appendChild(nav);
  hookExistingHeroNav(hero, targets);
}

function hookExistingHeroNav(hero: HTMLElement, targets?: Array<{ el: HTMLElement }>) {
  const buttons = Array.from(hero.querySelectorAll("button,a")) as HTMLElement[];
  buttons.forEach((button) => {
    if (button.dataset.feloralHeroNavHooked === "true") return;
    const text = (button.textContent || "").trim();
    const aria = (button.getAttribute("aria-label") || button.getAttribute("title") || "").toLowerCase();
    const combined = `${text} ${aria}`.toLowerCase();

    const isPrev = /Ù‚Ø¨Ù„ÛŒ|previous|prev/.test(combined) || text === "â€¹" || text === "â†";
    const isNext = /Ø¨Ø¹Ø¯ÛŒ|next/.test(combined) || text === "â€º" || text === "â†’";
    if (!isPrev && !isNext) return;

    button.dataset.feloralHeroNavHooked = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cycleHeroImage(isPrev ? -1 : 1, targets);
    }, true);
  });
}

function oldDeleteState() {
  return OLD_DELETE_KEYS.concat([DELETED_KEY]).some((key) => window.localStorage.getItem(key) === "1");
}

export function HeroStudioRuntime() {
  useEffect(() => {
    let stopped = false;
    let lastTargets: Array<{ id: string; key: string; label: string; value: string; el: HTMLElement }> = [];

    const getTargets = () => lastTargets;
    installFetchInterceptor(getTargets);
    unhideOldDamage();

    const oldSaved = OLD_BG_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) || "";
    if (oldSaved && !window.localStorage.getItem(BG_KEY)) {
      window.localStorage.setItem(BG_KEY, oldSaved);
      addImageToList(oldSaved);
    }

    const run = async () => {
      if (stopped) return;

      removeOldButtons();
      unhideOldDamage();

      const cms = await fetchCmsData();
      if (stopped) return;

      const textMap = cms.reduce<Map<string, string>>(
  (acc, item) => {
    const map = collectTextMap(item);

    map.forEach((value, key) => {
      acc.set(key, value);
    });

    return acc;
  },
  new Map<string, string>(),
);

      lastTargets = findHeroTextTargets(textMap);

      applySavedHeroTextPositions(lastTargets);
      makeHeroDragHandles(lastTargets);
      makeFloatingDelete(lastTargets);
      makeHeroNavigation(lastTargets);

      if (oldDeleteState()) {
        clearHeroBackground(lastTargets);
        return;
      }

      const savedBg = window.localStorage.getItem(BG_KEY);
      if (savedBg) {
        applyHeroBackground(savedBg, lastTargets);
        return;
      }

      const candidates = cms.flatMap((item) => collectCandidates(item)).sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const existingList = readImageList();
      const mergedList = writeImageList([...existingList, ...candidates.map((item) => item.value)]);

      if (best?.value) applyHeroBackground(best.value, lastTargets);
      else if (mergedList[0]) applyHeroBackground(mergedList[0], lastTargets);
    };

    void run();

    const interval = window.setInterval(() => {
      if (editorMode()) void run();
    }, 1800);

    const observer = new MutationObserver(() => {
      unhideOldDamage();
      if (lastTargets.length) {
        makeFloatingDelete(lastTargets);
        makeHeroNavigation(lastTargets);
        applySavedHeroTextPositions(lastTargets);
      }

      const savedBg = window.localStorage.getItem(BG_KEY);
      if (savedBg && !oldDeleteState()) applyHeroBackground(savedBg, lastTargets);
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

