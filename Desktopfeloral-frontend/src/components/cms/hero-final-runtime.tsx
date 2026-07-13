"use client";

import { canUseCmsEditor } from "@/lib/cms-editor-access";

import { useEffect } from "react";

type SavedPosition = { left: number; top: number; width?: number };
type DragMap = Record<string, SavedPosition>;
type Candidate = { key: string; value: string; score: number };

const BG_KEY = "feloral.hero.final.bg";
const BG_LIST_KEY = "feloral.hero.final.bg.list";
const BG_INDEX_KEY = "feloral.hero.final.bg.index";
const BG_DELETED_KEY = "feloral.hero.final.bg.deleted";
const DRAG_KEY = "feloral.hero.final.drag";

const OLD_BG_KEYS = [
  "feloral.hero.background.url.v3",
  "feloral.hero.background.url.v4",
  "feloral.hero.background.url.v5",
  "feloral.hero.studio.background.v1",
];

const OLD_DELETE_KEYS = [
  "feloral.hero.background.deleted.v4",
  "feloral.hero.background.deleted.v5",
  "feloral.hero.studio.background.deleted.v1",
];

const TEXT_KEYS = [
  { id: "eyebrow", key: "home.hero.eyebrow", label: "Ø¨Ø§Ù„Ø§Ù†ÙˆÛŒØ³ Ù‡ÛŒØ±Ùˆ" },
  { id: "title", key: "home.hero.title", label: "Ø¹Ù†ÙˆØ§Ù† Ù‡ÛŒØ±Ùˆ" },
  { id: "subtitle", key: "home.hero.subtitle", label: "Ø²ÛŒØ±Ø¹Ù†ÙˆØ§Ù† Ù‡ÛŒØ±Ùˆ" },
  { id: "cta", key: "home.hero.cta", label: "Ø¯Ú©Ù…Ù‡ Ù‡ÛŒØ±Ùˆ" },
];

const HERO_BG_KEYS = [
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

function isEditor() {
  if (typeof window === "undefined") return false;
  return canUseCmsEditor();
}

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

function normalizeUrl(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("/")) return `${apiBase()}${value}`;
  if (/^(uploads|media|files|static)\//i.test(value)) return `${apiBase()}/${value}`;
  return value;
}

function isImageUrl(raw: string) {
  const value = String(raw || "").toLowerCase();
  return (
    value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    value.includes("/uploads/") ||
    value.includes("/media/") ||
    value.includes("/files/") ||
    value.includes("image/upload") ||
    /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(value)
  );
}

function setImportant(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value, "important");
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
    } catch {
      // ignore
    }
  }

  if (silent) return "";
  return window.prompt("Access Token Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†:") || "";
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

  const result: unknown[] = [];

  for (const url of urls) {
    const json = await fetchJson(url, token);
    if (json) result.push(json);
  }

  return result;
}

function candidateScore(path: string, value: string) {
  const p = String(path || "").toLowerCase();
  let score = 0;

  if (p.includes("hero")) score += 80;
  if (p.includes("home")) score += 20;
  if (p.includes("background") || p.includes("bg")) score += 65;
  if (p.includes("banner")) score += 35;
  if (p.includes("image") || p.includes("media") || p.includes("photo") || p.includes("url")) score += 25;
  if (isImageUrl(value)) score += 45;
  if (p.includes("logo") || p.includes("icon") || p.includes("avatar") || p.includes("thumbnail")) score -= 120;

  return score;
}

function collectImageCandidates(data: unknown, loose = false) {
  const out: Candidate[] = [];

  function add(path: string, valueRaw: unknown) {
    if (typeof valueRaw !== "string") return;
    const value = normalizeUrl(valueRaw);
    if (!value || !isImageUrl(value)) return;
    const score = candidateScore(path, value);
    if (loose || score >= 55) out.push({ key: path, value, score });
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
      const obj = node as Record<string, unknown>;
      const explicitKey =
        (typeof obj.key === "string" ? obj.key : "") ||
        (typeof obj.cmsKey === "string" ? obj.cmsKey : "") ||
        (typeof obj.name === "string" ? obj.name : "");

      if (explicitKey) {
        [
          obj.value,
          obj.url,
          obj.src,
          obj.path,
          obj.mediaUrl,
          obj.imageUrl,
          obj.backgroundImage,
          obj.backgroundUrl,
          obj.fileUrl,
          obj.content,
          obj.text,
        ].forEach((value) => add(explicitKey, value));
      }

      Object.entries(obj).forEach(([key, value]) => {
        const nextPath = explicitKey && key === "value" ? explicitKey : path ? `${path}.${key}` : key;
        walk(value, nextPath);
      });
    }
  }

  walk(data, "");

  const unique = new Map<string, Candidate>();
  out.forEach((item) => {
    const id = `${item.key}:${item.value}`;
    const old = unique.get(id);
    if (!old || item.score > old.score) unique.set(id, item);
  });

  return Array.from(unique.values()).sort((a, b) => b.score - a.score);
}

function collectTextMap(data: unknown) {
  const map = new Map<string, string>();

  function set(key: string, value: unknown) {
    if (typeof value !== "string") return;
    const text = value.replace(/\s+/g, " ").trim();
    if (!text || isImageUrl(text)) return;
    map.set(key, text);
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
      const obj = node as Record<string, unknown>;
      const explicitKey =
        (typeof obj.key === "string" ? obj.key : "") ||
        (typeof obj.cmsKey === "string" ? obj.cmsKey : "") ||
        (typeof obj.name === "string" ? obj.name : "");

      if (explicitKey) {
        [obj.value, obj.text, obj.content, obj.label].forEach((value) => set(explicitKey, value));
      }

      Object.entries(obj).forEach(([key, value]) => {
        const nextPath = explicitKey && key === "value" ? explicitKey : path ? `${path}.${key}` : key;
        walk(value, nextPath);
      });
    }
  }

  walk(data, "");
  return map;
}

function readDragMap(): DragMap {
  try {
    return JSON.parse(window.localStorage.getItem(DRAG_KEY) || "{}") as DragMap;
  } catch {
    return {};
  }
}

function writeDragMap(map: DragMap) {
  window.localStorage.setItem(DRAG_KEY, JSON.stringify(map));
}

function readImageList() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BG_LIST_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => normalizeUrl(String(x || ""))).filter((x) => x && isImageUrl(x));
  } catch {
    return [];
  }
}

function writeImageList(list: string[]) {
  const clean = Array.from(new Set(list.map(normalizeUrl).filter((x) => x && isImageUrl(x))));
  window.localStorage.setItem(BG_LIST_KEY, JSON.stringify(clean));
  return clean;
}

function addImageToList(url: string) {
  const clean = normalizeUrl(url);
  if (!clean || !isImageUrl(clean)) return readImageList();
  const list = writeImageList([clean, ...readImageList()]);
  window.localStorage.setItem(BG_INDEX_KEY, "0");
  return list;
}

function visible(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function unhidePreviousDamage() {
  document.querySelectorAll("[data-feloral-hero-visual-hidden='true']").forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("opacity");
    delete el.dataset.feloralHeroVisualHidden;
  });
}

function byText(value: string, kind: string) {
  const exact = String(value || "").replace(/\s+/g, " ").trim();
  if (!exact) return null;

  const root = document.querySelector("main") || document.body;
  const nodes = Array.from(root.querySelectorAll("h1,h2,h3,p,span,a,button,div")) as HTMLElement[];

  const scored = nodes
    .filter((node) => visible(node) && !node.closest("header"))
    .map((node) => {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return null;

      let score = 0;
      if (text === exact) score += 120;
      else if (text.includes(exact)) score += 55;
      else if (exact.includes(text) && text.length > 3) score += 25;
      else return null;

      const tag = node.tagName.toLowerCase();
      const rect = node.getBoundingClientRect();

      if (kind === "title" && /^h[1-3]$/.test(tag)) score += 45;
      if (kind === "subtitle" && (tag === "p" || tag === "div" || tag === "span")) score += 22;
      if (kind === "eyebrow" && (tag === "span" || tag === "p" || tag === "div")) score += 22;
      if (kind === "cta" && (tag === "a" || tag === "button")) score += 55;

      if (rect.top > 40 && rect.top < window.innerHeight * 0.95) score += 25;
      if (rect.top < 75) score -= 25;
      if (String(node.className || "").toLowerCase().includes("hero")) score += 16;

      // Prefer smaller exact item instead of wrapper.
      score -= Math.min(30, rect.width / 260);

      return { node, score };
    })
    .filter(Boolean) as Array<{ node: HTMLElement; score: number }>;

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.node || null;
}

function byCmsKey(key: string) {
  const attrs = ["data-cms-key", "data-feloral-cms-key", "data-edit-key", "data-key"];

  for (const attr of attrs) {
    try {
      const el = document.querySelector(`[${attr}="${key}"]`) as HTMLElement | null;
      if (el && !el.closest("header")) return el;
    } catch {
      // ignore
    }
  }

  return null;
}

function findHeroTextTargets(textMap: Map<string, string>) {
  return TEXT_KEYS.map((item) => {
    const value = textMap.get(item.key) || "";
    const element = byCmsKey(item.key) || byText(value, item.id);
    return { ...item, value, el: element };
  }).filter((item) => Boolean(item.el)) as Array<{ id: string; key: string; label: string; value: string; el: HTMLElement }>;
}

function climbToHeroBox(el: HTMLElement | null) {
  if (!el || el.closest("header")) return null;

  const section = el.closest("section") as HTMLElement | null;
  if (section && !section.closest("header")) return section;

  let current: HTMLElement | null = el;

  for (let i = 0; i < 9 && current?.parentElement; i += 1) {
    const parent = current.parentElement as HTMLElement;
    if (parent.closest("header")) return null;

    const rect = parent.getBoundingClientRect();
    if (rect.width > 680 && rect.height > 250) return parent;

    current = parent;
  }

  return el;
}

function findHeroBox(targets?: Array<{ el: HTMLElement }>) {
  if (targets?.length) {
    for (const target of targets) {
      const box = climbToHeroBox(target.el);
      if (box) return box;
    }
  }

  const markedSelectors = [
    '[data-feloral-hero="true"]',
    '[data-section-key="home.hero"]',
    '[data-cms-section-key="home.hero"]',
    '[data-feloral-section="home.hero"]',
  ];

  for (const selector of markedSelectors) {
    const items = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    for (const item of items) {
      const box = climbToHeroBox(item);
      if (box) return box;
    }
  }

  const sections = (Array.from(document.querySelectorAll("main section, section")) as HTMLElement[])
    .filter((section) => !section.closest("header"))
    .filter((section) => {
      const rect = section.getBoundingClientRect();
      return rect.width > 680 && rect.height > 250 && rect.top < window.innerHeight * 1.25;
    });

  return sections[0] || null;
}

function ensureBgLayer(hero: HTMLElement) {
  let layer = hero.querySelector('[data-feloral-hero-bg-layer="true"]') as HTMLElement | null;

  if (!layer) {
    layer = document.createElement("div");
    layer.dataset.feloralHeroBgLayer = "true";
    hero.insertBefore(layer, hero.firstChild);
  }

  hero.dataset.feloralHeroFinalBox = "true";
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
    const el = child as HTMLElement;
    if (window.getComputedStyle(el).position === "static") setImportant(el, "position", "relative");
    setImportant(el, "z-index", "1");
  });

  return layer;
}

function hideOnlyDuplicateImageOutsideHero(url: string, hero: HTMLElement) {
  const normalized = normalizeUrl(url);
  const file = normalized.split("?")[0].split("/").pop() || "";

  if (!file && !normalized) return;

  const heroRect = hero.getBoundingClientRect();
  const images = Array.from(document.querySelectorAll("main img, section img")) as HTMLImageElement[];

  images.forEach((img) => {
    if (hero.contains(img)) return;

    const src = normalizeUrl(img.currentSrc || img.src || "");
    if (!src) return;

    const same =
      src === normalized ||
      Boolean(file && src.includes(file)) ||
      Boolean(file && decodeURIComponent(src).includes(decodeURIComponent(file)));

    if (!same) return;

    const rect = img.getBoundingClientRect();
    const nearHero = rect.top >= heroRect.top - 60 && rect.top <= heroRect.bottom + 850;

    if (!nearHero) return;

    // Only the image itself is hidden. Hero content/box is never hidden.
    img.dataset.feloralHeroVisualHidden = "true";
    setImportant(img, "display", "none");
  });
}

function applyHeroBackground(url: string, targets?: Array<{ el: HTMLElement }>) {
  const clean = normalizeUrl(url);
  const hero = findHeroBox(targets);

  if (!hero || !clean) return false;

  unhidePreviousDamage();

  const layer = ensureBgLayer(hero);
  const bg = `linear-gradient(90deg, rgba(8,7,6,.58), rgba(8,7,6,.15)), url("${clean}")`;

  setImportant(layer, "background-image", bg);
  setImportant(hero, "background-image", bg);
  setImportant(hero, "background-size", "cover");
  setImportant(hero, "background-position", "center");
  setImportant(hero, "background-repeat", "no-repeat");

  if (hero.offsetHeight < 420) setImportant(hero, "min-height", "520px");

  window.localStorage.setItem(BG_KEY, clean);
  window.localStorage.removeItem(BG_DELETED_KEY);
  OLD_DELETE_KEYS.forEach((key) => window.localStorage.removeItem(key));

  addImageToList(clean);
  hideOnlyDuplicateImageOutsideHero(clean, hero);

  return true;
}

function clearHeroBackground(targets?: Array<{ el: HTMLElement }>) {
  window.localStorage.removeItem(BG_KEY);
  OLD_BG_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(BG_DELETED_KEY, "1");

  document.querySelectorAll('[data-feloral-hero-bg-layer="true"]').forEach((node) => node.remove());

  const hero = findHeroBox(targets);
  if (hero) {
    hero.style.removeProperty("background-image");
    hero.style.removeProperty("background-size");
    hero.style.removeProperty("background-position");
    hero.style.removeProperty("background-repeat");
  }

  unhidePreviousDamage();
}

async function patchContent(key: string, value: string) {
  const token = tokenFromStorage(false);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${apiBase()}/cms/admin/contents/${encodeURIComponent(key)}`;
  const bodies = [{ value }, { content: value }, { text: value }, { mediaUrl: value }, { imageUrl: value }, { url: value }];

  for (const body of bodies) {
    try {
      const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (res.ok) return true;
    } catch {
      // try next body
    }
  }

  return false;
}

async function deleteHeroBackground(targets?: Array<{ el: HTMLElement }>) {
  const cms = await fetchCmsData();
  const keys = new Set<string>(HERO_BG_KEYS);

  cms.flatMap((item) => collectImageCandidates(item)).forEach((item) => {
    if (/hero/i.test(item.key) && /(background|bg|image|banner|media|photo|url)/i.test(item.key)) keys.add(item.key);
  });

  let ok = false;
  for (const key of Array.from(keys)) ok = (await patchContent(key, "")) || ok;

  clearHeroBackground(targets);

  if (ok) window.alert("Ø¹Ú©Ø³ Ù¾Ø³â€ŒØ²Ù…ÛŒÙ†Ù‡ Ù‡ÛŒØ±Ùˆ Ø­Ø°Ù Ø´Ø¯.");
  else window.alert("Ø¹Ú©Ø³ Ø§Ø² ØµÙØ­Ù‡ Ø­Ø°Ù Ø´Ø¯. Ø§Ú¯Ø± Ø¨Ø±Ú¯Ø´ØªØŒ ÛŒÚ©â€ŒØ¨Ø§Ø± Access Token Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†.");
}

function removeRuntimeUi() {
  document
    .querySelectorAll(
      "[data-feloral-hero-nav='true'],[data-feloral-hero-drag-handle='true'],[data-feloral-delete-hero-bg-inline='true'],[data-feloral-delete-wrapper='true']"
    )
    .forEach((node) => node.remove());

  Array.from(document.querySelectorAll("button")).forEach((button) => {
    const text = (button.textContent || "").trim();
    if (text === "Ø­Ø°Ù Ø¹Ú©Ø³" && !button.hasAttribute("data-feloral-delete-hero-bg")) button.remove();
  });
}

function floatingDelete(targets?: Array<{ el: HTMLElement }>) {
  if (!isEditor()) return;
  if (document.querySelector("[data-feloral-delete-hero-bg='true']")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.feloralDeleteHeroBg = "true";
  btn.textContent = "Ø­Ø°Ù Ø¹Ú©Ø³ Ù‡ÛŒØ±Ùˆ";

  setImportant(btn, "position", "fixed");
  setImportant(btn, "left", "18px");
  setImportant(btn, "bottom", "68px");
  setImportant(btn, "z-index", "99999");

  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "999px";
  btn.style.border = "1px solid rgba(255,90,90,.65)";
  btn.style.background = "rgba(80,18,18,.92)";
  btn.style.color = "#ffecec";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "900";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
  btn.onclick = () => void deleteHeroBackground(targets);

  document.body.appendChild(btn);
}

function applyDrag(el: HTMLElement, pos: SavedPosition) {
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

function makeTextDraggable(targets: Array<{ id: string; label: string; el: HTMLElement }>) {
  const saved = readDragMap();

  targets.forEach((target) => {
    const el = target.el;
    if (saved[target.id]) applyDrag(el, saved[target.id]);

    if (!isEditor()) return;
    if (document.querySelector(`[data-feloral-hero-drag-handle-id="${target.id}"]`)) return;

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
    window.setInterval(place, 700);

    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        const rect = el.getBoundingClientRect();
        const sx = event.clientX;
        const sy = event.clientY;
        const sl = rect.left;
        const st = rect.top;

        applyDrag(el, { left: Math.round(sl), top: Math.round(st), width: Math.round(rect.width) });

        el.style.outline = "2px solid rgba(214,168,79,.95)";
        el.style.outlineOffset = "4px";
        handle.style.cursor = "grabbing";

        const move = (e: PointerEvent) => {
          e.preventDefault();

          const left = Math.max(0, Math.round(sl + e.clientX - sx));
          const top = Math.max(0, Math.round(st + e.clientY - sy));

          setImportant(el, "left", `${left}px`);
          setImportant(el, "top", `${top}px`);

          handle.style.left = `${Math.max(6, left)}px`;
          handle.style.top = `${Math.max(6, top - 30)}px`;
        };

        const up = () => {
          window.removeEventListener("pointermove", move, true);
          window.removeEventListener("pointerup", up, true);

          const final = el.getBoundingClientRect();
          const latest = readDragMap();

          latest[target.id] = {
            left: Math.max(0, Math.round(final.left)),
            top: Math.max(0, Math.round(final.top)),
            width: Math.round(final.width),
          };

          writeDragMap(latest);

          el.style.outline = "1px dashed rgba(214,168,79,.45)";
          el.style.outlineOffset = "4px";
          handle.style.cursor = "grab";
          place();
        };

        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", up, true);
      },
      true
    );

    document.body.appendChild(handle);
  });
}

function cycleImage(step: number, targets?: Array<{ el: HTMLElement }>) {
  const list = readImageList();
  if (!list.length) return;

  const current = Number(window.localStorage.getItem(BG_INDEX_KEY) || "0") || 0;
  const next = (current + step + list.length) % list.length;

  window.localStorage.setItem(BG_INDEX_KEY, String(next));
  applyHeroBackground(list[next], targets);
}

function heroNav(targets?: Array<{ el: HTMLElement }>) {
  const hero = findHeroBox(targets);
  if (!hero) return;

  // Hook existing nav-like buttons.
  Array.from(hero.querySelectorAll("button,a")).forEach((node) => {
    const el = node as HTMLElement;
    if (el.dataset.feloralHeroNavHooked === "true") return;

    const text = (el.textContent || "").trim();
    const meta = `${text} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase();

    const prev = /Ù‚Ø¨Ù„ÛŒ|previous|prev/.test(meta) || text === "â€¹" || text === "â†";
    const next = /Ø¨Ø¹Ø¯ÛŒ|next/.test(meta) || text === "â€º" || text === "â†’";

    if (!prev && !next) return;

    el.dataset.feloralHeroNavHooked = "true";
    el.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        cycleImage(prev ? -1 : 1, targets);
      },
      true
    );
  });

  if (document.querySelector("[data-feloral-hero-nav='true']")) return;

  const wrap = document.createElement("div");
  wrap.dataset.feloralHeroNav = "true";

  setImportant(wrap, "position", "absolute");
  setImportant(wrap, "right", "22px");
  setImportant(wrap, "bottom", "22px");
  setImportant(wrap, "z-index", "25");

  wrap.style.display = "flex";
  wrap.style.gap = "8px";

  const prev = document.createElement("button");
  const next = document.createElement("button");

  [prev, next].forEach((btn) => {
    btn.type = "button";
    btn.style.width = "38px";
    btn.style.height = "38px";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(255,255,255,.35)";
    btn.style.background = "rgba(10,10,12,.48)";
    btn.style.color = "white";
    btn.style.fontSize = "20px";
    btn.style.fontWeight = "900";
    btn.style.cursor = "pointer";
    btn.style.backdropFilter = "blur(10px)";
  });

  prev.textContent = "â€¹";
  next.textContent = "â€º";
  prev.title = "Ø¹Ú©Ø³ Ù‚Ø¨Ù„ÛŒ";
  next.title = "Ø¹Ú©Ø³ Ø¨Ø¹Ø¯ÛŒ";

  prev.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    cycleImage(-1, targets);
  };

  next.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    cycleImage(1, targets);
  };

  wrap.appendChild(prev);
  wrap.appendChild(next);
  hero.appendChild(wrap);
}

function responseImage(data: unknown) {
  const all = collectImageCandidates(data, true);
  return all[0]?.value || "";
}

function patchFetch(getTargets: () => Array<{ el: HTMLElement }>) {
  const w = window as typeof window & { __feloralHeroFinalFetch?: boolean };
  if (w.__feloralHeroFinalFetch) return;
  w.__feloralHeroFinalFetch = true;

  const original = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const res = await original(...args);

    try {
      const url = String(args[0] instanceof Request ? args[0].url : args[0]);
      const method =
        args[0] instanceof Request
          ? args[0].method
          : typeof args[1]?.method === "string"
            ? args[1].method
            : "GET";

      const relevant = /cms\/admin\/media\/upload|upload|media-url|contents|sections|homepage/i.test(url) && /POST|PATCH|PUT/i.test(method);

      if (relevant) {
        res.clone()
          .json()
          .then((json) => {
            const img = responseImage(json);
            if (img && isEditor()) applyHeroBackground(img, getTargets());
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }

    return res;
  };
}

function deleted() {
  return window.localStorage.getItem(BG_DELETED_KEY) === "1" || OLD_DELETE_KEYS.some((key) => window.localStorage.getItem(key) === "1");
}

export function HeroFinalRuntime() {
  useEffect(() => {
    let stopped = false;
    let lastTargets: Array<{ id: string; key: string; label: string; value: string; el: HTMLElement }> = [];

    patchFetch(() => lastTargets);
    unhidePreviousDamage();

    const migrated = OLD_BG_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) || "";
    if (migrated && !window.localStorage.getItem(BG_KEY)) {
      window.localStorage.setItem(BG_KEY, migrated);
      addImageToList(migrated);
    }

    const run = async () => {
      if (stopped) return;

      removeRuntimeUi();
      unhidePreviousDamage();

      const cmsData = await fetchCmsData();
      if (stopped) return;

      const textMap = cmsData.reduce((acc, item) => {
        collectTextMap(item).forEach((value, key) => acc.set(key, value));
        return acc;
      }, new Map<string, string>());

      lastTargets = findHeroTextTargets(textMap);

      makeTextDraggable(lastTargets);
      floatingDelete(lastTargets);
      heroNav(lastTargets);

      if (deleted()) {
        clearHeroBackground(lastTargets);
        return;
      }

      const saved = window.localStorage.getItem(BG_KEY);
      if (saved) {
        applyHeroBackground(saved, lastTargets);
        return;
      }

      const candidates = cmsData.flatMap((item) => collectImageCandidates(item)).sort((a, b) => b.score - a.score);
      const list = writeImageList([...readImageList(), ...candidates.map((item) => item.value)]);

      if (candidates[0]?.value) applyHeroBackground(candidates[0].value, lastTargets);
      else if (list[0]) applyHeroBackground(list[0], lastTargets);
    };

    void run();

    const interval = window.setInterval(() => {
      if (isEditor()) void run();
    }, 1800);

    const observer = new MutationObserver(() => {
      unhidePreviousDamage();

      const saved = window.localStorage.getItem(BG_KEY);
      if (saved && !deleted()) applyHeroBackground(saved, lastTargets);

      if (lastTargets.length) {
        makeTextDraggable(lastTargets);
        floatingDelete(lastTargets);
        heroNav(lastTargets);
      }
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

