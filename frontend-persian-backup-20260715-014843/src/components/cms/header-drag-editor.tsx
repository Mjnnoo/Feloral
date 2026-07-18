"use client";

import { canUseCmsEditor } from "@/lib/cms-editor-access";

import { useEffect } from "react";

type SavedPosition = {
  left: number;
  top: number;
  width?: number;
};

type SavedMap = Record<string, SavedPosition>;

const STORAGE_KEY = "feloral.header.draggable.items.handles.v2";

function inEditorMode() {
  if (typeof window === "undefined") return false;
  return canUseCmsEditor();
}

function readSaved(): SavedMap {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as SavedMap;
  } catch {
    return {};
  }
}

function writeSaved(saved: SavedMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function setImportantStyle(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value, "important");
}

function applyFixed(el: HTMLElement, pos: SavedPosition) {
  setImportantStyle(el, "position", "fixed");
  setImportantStyle(el, "left", `${pos.left}px`);
  setImportantStyle(el, "top", `${pos.top}px`);
  setImportantStyle(el, "right", "auto");
  setImportantStyle(el, "bottom", "auto");
  setImportantStyle(el, "margin", "0");
  setImportantStyle(el, "transform", "none");
  setImportantStyle(el, "z-index", "99980");

  if (pos.width && pos.width > 20) {
    setImportantStyle(el, "width", `${pos.width}px`);
    setImportantStyle(el, "min-width", `${Math.min(pos.width, 160)}px`);
    setImportantStyle(el, "max-width", "none");
  }

  const input = el.querySelector("input") as HTMLInputElement | null;
  if (input) {
    setImportantStyle(input, "width", "100%");
  }
}

function searchBox() {
  const input = document.querySelector("header input") as HTMLInputElement | null;
  return (input?.closest("div") as HTMLElement | null) || null;
}

function getItems() {
  const nav = document.querySelector('[data-feloral-header-nav="right"]') as HTMLElement | null;
  const navLinks = nav ? (Array.from(nav.querySelectorAll("a")) as HTMLElement[]) : [];

  return [
    { id: "nav-home", label: "Ø®Ø§Ù†Ù‡", el: navLinks[0] || null },
    { id: "nav-brand", label: "Ø¨Ø±Ù†Ø¯Ù‡Ø§", el: navLinks[1] || null },
    { id: "nav-category", label: "Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ", el: navLinks[2] || null },
    { id: "nav-offer", label: "Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ ÙˆÛŒÚ˜Ù‡", el: navLinks[3] || null },
    { id: "cart", label: "Ø³Ø¨Ø¯ Ø®Ø±ÛŒØ¯", el: document.querySelector('header a[href="/cart"]') as HTMLElement | null },
    { id: "login", label: "ÙˆØ±ÙˆØ¯", el: (document.querySelector('header a[href="/account"]') || document.querySelector('header a[href="/login"]')) as HTMLElement | null },
    { id: "search", label: "Ø¬Ø³ØªØ¬Ùˆ", el: searchBox() },
    { id: "logo", label: "Ù„ÙˆÚ¯Ùˆ", el: document.querySelector('[data-feloral-header-logo="center"]') as HTMLElement | null },
  ].filter((x) => Boolean(x.el)) as Array<{ id: string; label: string; el: HTMLElement }>;
}

function clearOldHandles() {
  document
    .querySelectorAll("[data-feloral-drag-handle='true'],[data-feloral-drag-reset='true'],[data-feloral-resize-handle='true']")
    .forEach((n) => n.remove());
}

function makeHandle(item: { id: string; label: string; el: HTMLElement }) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.dataset.feloralDragHandle = "true";
  handle.dataset.feloralDragId = item.id;
  handle.textContent = `Ø¬Ø§Ø¨Ø¬Ø§ÛŒÛŒ ${item.label}`;

  handle.style.position = "fixed";
  handle.style.zIndex = item.id === "logo" ? "100001" : "99999";
  handle.style.padding = "6px 9px";
  handle.style.borderRadius = "999px";
  handle.style.border = "1px solid rgba(214,168,79,.72)";
  handle.style.background = "rgba(15,15,18,.92)";
  handle.style.color = "#f7e6bd";
  handle.style.fontSize = "11px";
  handle.style.fontWeight = "900";
  handle.style.lineHeight = "1";
  handle.style.cursor = "grab";
  handle.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
  handle.style.userSelect = "none";
  handle.style.touchAction = "none";

  function placeHandle() {
    const rect = item.el.getBoundingClientRect();
    handle.style.left = `${Math.max(6, Math.round(rect.left))}px`;
    handle.style.top = `${Math.max(6, Math.round(rect.top - 30))}px`;
  }

  placeHandle();
  const interval = window.setInterval(placeHandle, 700);

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = item.el.getBoundingClientRect();
    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;

    applyFixed(item.el, {
      left: Math.round(startLeft),
      top: Math.round(startTop),
      width: item.id === "search" ? Math.round(rect.width) : undefined,
    });

    item.el.style.outline = "2px solid rgba(214,168,79,.95)";
    item.el.style.outlineOffset = "4px";
    item.el.style.borderRadius = "12px";
    handle.style.cursor = "grabbing";

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {}

    const move = (e: PointerEvent) => {
      e.preventDefault();

      const left = Math.max(0, Math.round(startLeft + e.clientX - startMouseX));
      const top = Math.max(0, Math.round(startTop + e.clientY - startMouseY));

      setImportantStyle(item.el, "left", `${left}px`);
      setImportantStyle(item.el, "top", `${top}px`);

      handle.style.left = `${Math.max(6, left)}px`;
      handle.style.top = `${Math.max(6, top - 30)}px`;

      const resizeHandle = document.querySelector(`[data-feloral-resize-id="${item.id}"]`) as HTMLElement | null;
      if (resizeHandle) placeResizeHandle(item, resizeHandle);
    };

    const up = (e: PointerEvent) => {
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {}

      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);

      const finalRect = item.el.getBoundingClientRect();
      const saved = readSaved();

      saved[item.id] = {
        left: Math.max(0, Math.round(finalRect.left)),
        top: Math.max(0, Math.round(finalRect.top)),
        width: item.id === "search" ? Math.round(finalRect.width) : undefined,
      };

      writeSaved(saved);

      item.el.style.outline = "1px dashed rgba(214,168,79,.45)";
      item.el.style.outlineOffset = "4px";
      handle.style.cursor = "grab";
      placeHandle();
    };

    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  };

  handle.addEventListener("pointerdown", down, true);
  document.body.appendChild(handle);

  return () => {
    window.clearInterval(interval);
    handle.removeEventListener("pointerdown", down, true);
    handle.remove();
  };
}

function placeResizeHandle(item: { id: string; label: string; el: HTMLElement }, handle: HTMLElement) {
  const rect = item.el.getBoundingClientRect();
  handle.style.left = `${Math.max(6, Math.round(rect.right - 10))}px`;
  handle.style.top = `${Math.max(6, Math.round(rect.top + rect.height / 2 - 14))}px`;
}

function makeSearchResizeHandle(item: { id: string; label: string; el: HTMLElement }) {
  if (item.id !== "search") return () => {};

  const handle = document.createElement("button");
  handle.type = "button";
  handle.dataset.feloralResizeHandle = "true";
  handle.dataset.feloralResizeId = item.id;
  handle.textContent = "â†”";
  handle.title = "Ø¨Ø±Ø§ÛŒ Ú©ÙˆÚ†Ú© Ùˆ Ø¨Ø²Ø±Ú¯ Ú©Ø±Ø¯Ù† Ø¹Ø±Ø¶ Ø¨Ø§Ú©Ø³ Ø¬Ø³ØªØ¬Ùˆ Ø¨Ú©Ø´";

  handle.style.position = "fixed";
  handle.style.zIndex = "100002";
  handle.style.width = "28px";
  handle.style.height = "28px";
  handle.style.borderRadius = "999px";
  handle.style.border = "1px solid rgba(214,168,79,.85)";
  handle.style.background = "rgba(15,15,18,.96)";
  handle.style.color = "#f7e6bd";
  handle.style.fontSize = "15px";
  handle.style.fontWeight = "900";
  handle.style.lineHeight = "1";
  handle.style.cursor = "ew-resize";
  handle.style.boxShadow = "0 12px 30px rgba(0,0,0,.36)";
  handle.style.userSelect = "none";
  handle.style.touchAction = "none";

  placeResizeHandle(item, handle);
  const interval = window.setInterval(() => placeResizeHandle(item, handle), 700);

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = item.el.getBoundingClientRect();
    const startX = event.clientX;
    const startWidth = rect.width;

    applyFixed(item.el, {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
    });

    item.el.style.outline = "2px solid rgba(214,168,79,.95)";
    item.el.style.outlineOffset = "4px";

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {}

    const move = (e: PointerEvent) => {
      e.preventDefault();

      const delta = e.clientX - startX;
      const nextWidth = Math.max(150, Math.min(620, Math.round(startWidth + delta)));

      setImportantStyle(item.el, "width", `${nextWidth}px`);
      setImportantStyle(item.el, "min-width", `${Math.min(nextWidth, 150)}px`);
      setImportantStyle(item.el, "max-width", "none");

      const input = item.el.querySelector("input") as HTMLInputElement | null;
      if (input) setImportantStyle(input, "width", "100%");

      placeResizeHandle(item, handle);
    };

    const up = (e: PointerEvent) => {
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {}

      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);

      const finalRect = item.el.getBoundingClientRect();
      const saved = readSaved();
      saved[item.id] = {
        left: Math.max(0, Math.round(finalRect.left)),
        top: Math.max(0, Math.round(finalRect.top)),
        width: Math.max(150, Math.round(finalRect.width)),
      };

      writeSaved(saved);

      item.el.style.outline = "1px dashed rgba(214,168,79,.45)";
      item.el.style.outlineOffset = "4px";
      placeResizeHandle(item, handle);
    };

    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  };

  handle.addEventListener("pointerdown", down, true);
  document.body.appendChild(handle);

  return () => {
    window.clearInterval(interval);
    handle.removeEventListener("pointerdown", down, true);
    handle.remove();
  };
}

function makeResetButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.feloralDragReset = "true";
  btn.textContent = "Ø¨Ø§Ø²Ù†Ø´Ø§Ù†ÛŒ Ø¬Ø§ÛŒÚ¯Ø§Ù‡ Ù‡Ø¯Ø±";
  btn.style.position = "fixed";
  btn.style.left = "18px";
  btn.style.bottom = "18px";
  btn.style.zIndex = "99999";
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "999px";
  btn.style.border = "1px solid rgba(214,168,79,.65)";
  btn.style.background = "rgba(15,15,18,.92)";
  btn.style.color = "#f7e6bd";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "900";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 12px 30px rgba(0,0,0,.32)";
  btn.onclick = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("feloral.header.draggable.items.v1");
    window.location.reload();
  };
  document.body.appendChild(btn);
}

export function HeaderDragEditor() {
  useEffect(() => {
    const saved = readSaved();
    const cleanups: Array<() => void> = [];

    const install = () => {
      clearOldHandles();

      const items = getItems();

      for (const item of items) {
        if (saved[item.id]) applyFixed(item.el, saved[item.id]);

        if (inEditorMode()) {
          item.el.style.outline = "1px dashed rgba(214,168,79,.45)";
          item.el.style.outlineOffset = "4px";
          cleanups.push(makeHandle(item));
          cleanups.push(makeSearchResizeHandle(item));
        }
      }

      if (inEditorMode()) makeResetButton();
    };

    const t1 = window.setTimeout(install, 350);
    const t2 = window.setTimeout(install, 1200);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      for (const c of cleanups) c();
      clearOldHandles();
    };
  }, []);

  return null;
}

