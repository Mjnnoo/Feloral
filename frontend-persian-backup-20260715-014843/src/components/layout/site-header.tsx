"use client";

import { canUseCmsEditor } from "@/lib/cms-editor-access";

import Link from "next/link";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { nav, topLinks } from "@/data/home-v3";
import type { CmsHomepageResponse } from "@/lib/cms/types";
import { getImageUrl, getText } from "@/lib/cms/content";
import { CmsEditMarker } from "@/components/cms/cms-edit-marker";
import { CmsImageEditButton } from "@/components/cms/cms-image-edit-button";

type Props = {
  cms?: CmsHomepageResponse | null;
  logoText?: string;
  accentColor?: string;
  darkColor?: string;
};

type Offset = {
  x: number;
  y: number;
};

type LayoutMap = Record<string, Offset>;

type DraggableItemProps = {
  id: string;
  editorMode: boolean;
  layout: LayoutMap;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onStartDrag: (id: string, event: ReactPointerEvent<HTMLElement>) => void;
  title?: string;
};

const LOGO_CMS_KEY = "site.logo.text";
const LOGO_SIZE_CMS_KEY = "site.logo.size";
const HEADER_LAYOUT_CMS_KEY = "site.header.dragLayout";

const LOGO_VALUE_KEY = "feloral.header.logo.value.v3";
const LOGO_SIZE_KEY = "feloral.header.logo.size.v3";
const HEADER_LAYOUT_KEY = "feloral.header.dragLayout.v3";

const DEFAULT_LOGO_SIZE = 180;
const MIN_LOGO_SIZE = 70;
const MAX_LOGO_SIZE = 420;

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
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("blob:")) return raw;
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
    data?.data?.media?.url ||
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
  return canUseCmsEditor();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseLogoSize(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value, MIN_LOGO_SIZE, MAX_LOGO_SIZE) : null;
}

function readLogoSize() {
  if (typeof window === "undefined") return DEFAULT_LOGO_SIZE;
  return parseLogoSize(window.localStorage.getItem(LOGO_SIZE_KEY) || "") || DEFAULT_LOGO_SIZE;
}

function saveLogoSizeLocal(size: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOGO_SIZE_KEY, String(clamp(size, MIN_LOGO_SIZE, MAX_LOGO_SIZE)));
}

function readLogoValueLocal() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOGO_VALUE_KEY) || "";
}

function saveLogoValueLocal(value: string) {
  if (typeof window === "undefined") return;

  if (value) {
    window.localStorage.setItem(LOGO_VALUE_KEY, value);
  } else {
    window.localStorage.removeItem(LOGO_VALUE_KEY);
  }
}

function parseLayout(raw: string): LayoutMap {
  try {
    const parsed = JSON.parse(raw || "{}");

    if (!parsed || typeof parsed !== "object") return {};

    const next: LayoutMap = {};

    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as Offset).x === "number" &&
        typeof (value as Offset).y === "number"
      ) {
        next[key] = {
          x: Math.round((value as Offset).x),
          y: Math.round((value as Offset).y),
        };
      }
    }

    return next;
  } catch {
    return {};
  }
}

function readLayoutLocal() {
  if (typeof window === "undefined") return {};
  return parseLayout(window.localStorage.getItem(HEADER_LAYOUT_KEY) || "{}");
}

function saveLayoutLocal(layout: LayoutMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEADER_LAYOUT_KEY, JSON.stringify(layout));
}

function getTokenFromStorage(silent = false) {
  if (typeof window === "undefined") return "";

  const keys = Object.keys(window.localStorage);
  const priority = keys.filter((key) => /cms|admin|access|token|auth/i.test(key));
  const all = [...priority, ...keys.filter((key) => !priority.includes(key))];

  for (const key of all) {
    const value = window.localStorage.getItem(key) || "";

    if (!value) continue;

    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return value;
    }

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

async function saveContentKey(key: string, value: string, options?: { silentToken?: boolean }) {
  const token = getTokenFromStorage(Boolean(options?.silentToken));

  if (!token) {
    throw new Error("ØªÙˆÚ©Ù† Ø§Ø¯Ù…ÛŒÙ† Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const bodies = [
    { value, plainText: value, text: value, type: "text" },
    { value },
    { plainText: value },
    { text: value },
    { content: value },
  ];

  for (const body of bodies) {
    const response = await fetch(`${getApiBaseUrl()}/cms/admin/contents/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }).catch(() => null);

    if (response?.ok) return true;
  }

  const sectionKey = key.startsWith("site.logo") ? "site.logo" : "site.header";

  const createBodies = [
    {
      key,
      sectionKey,
      label: key,
      type: "text",
      value,
      plainText: value,
      isPublic: true,
    },
    {
      key,
      sectionKey,
      type: "text",
      value,
    },
    {
      key,
      value,
    },
  ];

  for (const body of createBodies) {
    const response = await fetch(`${getApiBaseUrl()}/cms/admin/contents`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }).catch(() => null);

    if (response?.ok) return true;
  }

  throw new Error("Ø°Ø®ÛŒØ±Ù‡ Ù…Ø­ØªÙˆØ§ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯");
}

async function uploadLogoFile(file: File) {
  const token = getTokenFromStorage();

  if (!token) {
    throw new Error("ØªÙˆÚ©Ù† Ø§Ø¯Ù…ÛŒÙ† Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("sectionKey", "site.logo");
  formData.append("key", LOGO_CMS_KEY);

  const endpoints = ["/cms/admin/media/upload", "/cms/admin/media", "/cms/media/upload"];

  for (const endpoint of endpoints) {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).catch(() => null);

    if (!response?.ok) continue;

    const payload = await response.json().catch(() => null);
    const image = getImageFromUploadPayload(payload);

    if (image) return image;
  }

  throw new Error("Ø¢Ù¾Ù„ÙˆØ¯ Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯");
}

function DraggableHeaderItem({
  id,
  editorMode,
  layout,
  className,
  style,
  children,
  onStartDrag,
  title,
}: DraggableItemProps) {
  const offset = layout[id] || { x: 0, y: 0 };

  const transformStyle: CSSProperties = {
    ...style,
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    cursor: editorMode ? "grab" : style?.cursor,
    touchAction: editorMode ? "none" : style?.touchAction,
    position: style?.position || "relative",
    zIndex: editorMode ? 30 : style?.zIndex,
  };

  return (
    <span
      data-feloral-universal-drag-id={id}
      className={className}
      style={transformStyle}
      title={title}
      onPointerDown={(event) => {
        if (!editorMode) return;

        onStartDrag(id, event);
      }}
      onClickCapture={(event) => {
        if (!editorMode) return;

        const moved = Number((event.currentTarget as HTMLElement).dataset.feloralMoved || "0");

        if (moved > 3) {
          event.preventDefault();
          event.stopPropagation();
          (event.currentTarget as HTMLElement).dataset.feloralMoved = "0";
        }
      }}
    >
      {children}
    </span>
  );
}

export function SiteHeader({
  cms = null,
  logoText = "FELORAL",
  accentColor = "#d6a84f",
  darkColor = "#070707",
}: Props) {
  const [liveCms, setLiveCms] = useState<CmsHomepageResponse | null>(cms);
  const [editorMode, setEditorMode] = useState(false);
  const [layout, setLayout] = useState<LayoutMap>({});
  const [logoSize, setLogoSize] = useState(DEFAULT_LOGO_SIZE);
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);
  const [localLogoValue, setLocalLogoValue] = useState("");
  const [draftLogoText, setDraftLogoText] = useState("");
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoStatus, setLogoStatus] = useState("");

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    element: HTMLElement | null;
  } | null>(null);

  const logoResizeRef = useRef<{
    startX: number;
    startSize: number;
  } | null>(null);

  useEffect(() => {
    setLiveCms(cms);
  }, [cms]);

  useEffect(() => {
    setEditorMode(isEditorMode());
    setLayout(readLayoutLocal());
    setLogoSize(readLogoSize());
    setLocalLogoValue(readLogoValueLocal());
  }, []);

  useEffect(() => {
    if (!liveCms) return;

    const cmsSize = parseLogoSize(getText(liveCms, LOGO_SIZE_CMS_KEY, ""));
    const cmsLayout = parseLayout(getText(liveCms, HEADER_LAYOUT_CMS_KEY, ""));

    if (typeof window !== "undefined" && !window.localStorage.getItem(LOGO_SIZE_KEY) && cmsSize) {
      setLogoSize(cmsSize);
      saveLogoSizeLocal(cmsSize);
    }

    if (
      typeof window !== "undefined" &&
      !window.localStorage.getItem(HEADER_LAYOUT_KEY) &&
      Object.keys(cmsLayout).length > 0
    ) {
      setLayout(cmsLayout);
      saveLayoutLocal(cmsLayout);
    }
  }, [liveCms]);

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

    const timer = window.setInterval(refreshCms, 2200);

    void refreshCms();

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [editorMode]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (dragRef.current) {
        event.preventDefault();

        const dx = event.clientX - dragRef.current.startX;
        const dy = event.clientY - dragRef.current.startY;
        const moved = Math.round(Math.abs(dx) + Math.abs(dy));

        if (dragRef.current.element) {
          dragRef.current.element.dataset.feloralMoved = String(moved);
        }

        const nextOffset = {
          x: Math.round(dragRef.current.startOffsetX + dx),
          y: Math.round(dragRef.current.startOffsetY + dy),
        };

        const id = dragRef.current.id;

        setLayout((current) => {
          const next = {
            ...current,
            [id]: nextOffset,
          };

          saveLayoutLocal(next);

          return next;
        });
      }

      if (logoResizeRef.current) {
        event.preventDefault();

        const nextSize = clamp(
          Math.round(logoResizeRef.current.startSize + event.clientX - logoResizeRef.current.startX),
          MIN_LOGO_SIZE,
          MAX_LOGO_SIZE,
        );

        setLogoSize(nextSize);
      }
    };

    const onPointerUp = () => {
      if (dragRef.current) {
        const finishedId = dragRef.current.id;

        dragRef.current = null;

        setLayout((current) => {
          saveLayoutLocal(current);
          void saveContentKey(HEADER_LAYOUT_CMS_KEY, JSON.stringify(current), { silentToken: true }).catch(() => {});
          return current;
        });

        window.setTimeout(() => {
          const element = document.querySelector(`[data-feloral-universal-drag-id="${finishedId}"]`) as HTMLElement | null;
          if (element) element.dataset.feloralMoved = "0";
        }, 80);
      }

      if (logoResizeRef.current) {
        logoResizeRef.current = null;

        setLogoSize((current) => {
          saveLogoSizeLocal(current);
          void saveContentKey(LOGO_SIZE_CMS_KEY, String(current), { silentToken: true }).catch(() => {});
          return current;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, []);

  const startDrag = (id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (!editorMode) return;

    const target = event.currentTarget as HTMLElement;
    const offset = layout[id] || { x: 0, y: 0 };

    event.preventDefault();
    event.stopPropagation();

    target.dataset.feloralMoved = "0";

    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      element: target,
    };
  };

  const startLogoResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    logoResizeRef.current = {
      startX: event.clientX,
      startSize: logoSize,
    };
  };

  const resetOne = async (id: string) => {
    setLayout((current) => {
      const next = { ...current };

      delete next[id];

      saveLayoutLocal(next);
      void saveContentKey(HEADER_LAYOUT_CMS_KEY, JSON.stringify(next), { silentToken: true }).catch(() => {});

      return next;
    });
  };

  const resetAll = async () => {
    setLayout({});
    saveLayoutLocal({});

    try {
      await saveContentKey(HEADER_LAYOUT_CMS_KEY, "{}");
      setLogoStatus("Ø¬Ø§ÛŒ Ù‡Ù…Ù‡ Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ÛŒ Ù‡Ø¯Ø± Ø±ÛŒØ³Øª Ùˆ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch {
      setLogoStatus("Ø¬Ø§ÛŒ Ù‡Ù…Ù‡ Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ Ø¯Ø± Ù‡Ù…ÛŒÙ† Ù…Ø±ÙˆØ±Ú¯Ø± Ø±ÛŒØ³Øª Ø´Ø¯");
    }
  };

  const resetLogoSize = async () => {
    setLogoSize(DEFAULT_LOGO_SIZE);
    saveLogoSizeLocal(DEFAULT_LOGO_SIZE);

    try {
      await saveContentKey(LOGO_SIZE_CMS_KEY, String(DEFAULT_LOGO_SIZE));
      setLogoStatus("Ø³Ø§ÛŒØ² Ù„ÙˆÚ¯Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch {
      setLogoStatus("Ø³Ø§ÛŒØ² Ù„ÙˆÚ¯Ùˆ Ø¯Ø± Ù‡Ù…ÛŒÙ† Ù…Ø±ÙˆØ±Ú¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    }
  };

  const updateLogoSizeLocal = (value: number) => {
    const next = clamp(value, MIN_LOGO_SIZE, MAX_LOGO_SIZE);
    setLogoSize(next);
    saveLogoSizeLocal(next);
  };

  const persistLogoSize = async (value: number) => {
    const next = clamp(value, MIN_LOGO_SIZE, MAX_LOGO_SIZE);

    setLogoSize(next);
    saveLogoSizeLocal(next);
    setLogoStatus("Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡ Ø³Ø§ÛŒØ²...");

    try {
      await saveContentKey(LOGO_SIZE_CMS_KEY, String(next));
      setLogoStatus("Ø³Ø§ÛŒØ² Ù„ÙˆÚ¯Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒØ´Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : "Ø³Ø§ÛŒØ² ÙÙ‚Ø· Ø¯Ø± Ù…Ø±ÙˆØ±Ú¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    }
  };

  const shippingNotice = getText(
    liveCms,
    "site.top.shippingNotice",
    "Ø§Ø±Ø³Ø§Ù„ Ø±Ø§ÛŒÚ¯Ø§Ù† Ø¨Ø±Ø§ÛŒ Ø®Ø±ÛŒØ¯Ù‡Ø§ÛŒ Ø¨Ø§Ù„Ø§ÛŒ Û±,ÛµÛ°Û°,Û°Û°Û° ØªÙˆÙ…Ø§Ù†",
  );

  const cmsLogoTextValue = getText(liveCms, LOGO_CMS_KEY, logoText || "FELORAL");
  const cmsLogoImageValue = normalizeAssetUrl(getImageUrl(liveCms, LOGO_CMS_KEY, ""));
  const logoValue = localLogoValue || cmsLogoImageValue || cmsLogoTextValue;
  const logoImage = isImageUrl(logoValue) ? normalizeAssetUrl(logoValue) : "";
  const logoTitle = logoImage ? logoText || "Feloral" : logoValue;

  const cartLabel = getText(liveCms, "site.header.cartLabel", "Ø³Ø¨Ø¯ Ø®Ø±ÛŒØ¯");
  const loginLabel = getText(liveCms, "site.header.loginLabel", "ÙˆØ±ÙˆØ¯ / Ø«Ø¨Øªâ€ŒÙ†Ø§Ù…");
  const searchPlaceholder = getText(liveCms, "site.header.searchPlaceholder", "Ø¬Ø³ØªØ¬ÙˆÛŒ Ù…Ø­ØµÙˆÙ„ØŒ Ø¨Ø±Ù†Ø¯ ÛŒØ§ Ø¯Ø³ØªÙ‡...");

  const logoSlotStyle: CSSProperties = {
    width: "190px",
    minWidth: "190px",
    height: "90px",
    minHeight: "90px",
    position: "relative",
    overflow: "visible",
  };

  const logoImageStyle: CSSProperties = {
    width: `${logoSize}px`,
    maxWidth: `${MAX_LOGO_SIZE}px`,
    height: "auto",
    display: "block",
  };

  const logoTextStyle: CSSProperties = {
    fontSize: `${clamp(Math.round(logoSize / 6.4), 18, 64)}px`,
  };

  const openLogoEditor = () => {
    if (!editorMode) return;

    setDraftLogoText(logoImage ? "" : logoValue);
    setLogoStatus("");
    setLogoEditorOpen(true);
  };

  const saveLogoText = async () => {
    const clean = draftLogoText.trim();

    if (!clean) {
      setLogoStatus("Ù…ØªÙ† Ù„ÙˆÚ¯Ùˆ Ø®Ø§Ù„ÛŒ Ø§Ø³Øª");
      return;
    }

    setLogoSaving(true);
    setLogoStatus("Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡ Ù…ØªÙ†...");

    try {
      await saveContentKey(LOGO_CMS_KEY, clean);
      setLocalLogoValue(clean);
      saveLogoValueLocal(clean);
      setLogoStatus("Ù…ØªÙ† Ù„ÙˆÚ¯Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒØ´Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : "Ø°Ø®ÛŒØ±Ù‡ Ù…ØªÙ† Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯");
    } finally {
      setLogoSaving(false);
    }
  };

  const saveLogoImage = async (file: File | null) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setLocalLogoValue(preview);
    setLogoSaving(true);
    setLogoStatus("Ø¯Ø± Ø­Ø§Ù„ Ø¢Ù¾Ù„ÙˆØ¯ Ùˆ Ø°Ø®ÛŒØ±Ù‡ Ø¹Ú©Ø³...");

    try {
      const image = await uploadLogoFile(file);
      await saveContentKey(LOGO_CMS_KEY, image);

      setLocalLogoValue(image);
      saveLogoValueLocal(image);
      setDraftLogoText("");
      setLogoStatus("Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒØ´Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : "Ø¢Ù¾Ù„ÙˆØ¯ Ø¹Ú©Ø³ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯");
    } finally {
      setLogoSaving(false);
      URL.revokeObjectURL(preview);
    }
  };

  const saveCurrentLogoImage = async () => {
    if (!logoImage) {
      setLogoStatus("Ø§ÙˆÙ„ Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†");
      return;
    }

    setLogoSaving(true);
    setLogoStatus("Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡ Ø¹Ú©Ø³...");

    try {
      await saveContentKey(LOGO_CMS_KEY, logoImage);
      setLocalLogoValue(logoImage);
      saveLogoValueLocal(logoImage);
      setLogoStatus("Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒØ´Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯");
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : "Ø°Ø®ÛŒØ±Ù‡ Ø¹Ú©Ø³ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯");
    } finally {
      setLogoSaving(false);
    }
  };

  const clearLocalLogo = () => {
    setLocalLogoValue("");
    saveLogoValueLocal("");
    setLogoStatus("Ù„ÙˆÚ¯ÙˆÛŒ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ Ø¯Ø± Ù…Ø±ÙˆØ±Ú¯Ø± Ù¾Ø§Ú© Ø´Ø¯Ø› Ù…Ù‚Ø¯Ø§Ø± CMS Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯");
  };

  return (
    <header className="relative z-[999900] text-white" style={{ backgroundColor: darkColor }}>
      {editorMode ? (
        <div className="fixed bottom-4 left-4 z-[1000000] flex gap-2 rounded-2xl border border-white/15 bg-black/85 p-2 shadow-2xl">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-xl border border-white/15 px-3 py-2 text-[11px] font-black text-white/80"
          >
            Ø±ÛŒØ³Øª Ø¬Ø§ÛŒ Ù‡Ù…Ù‡
          </button>
          <span className="px-2 py-2 text-[11px] font-bold text-white/45">
            Ø±ÙˆÛŒ Ù‡Ø± Ø¢ÛŒØªÙ… Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¨Ú©Ø´
          </span>
        </div>
      ) : null}

      <div data-feloral-topbar-exact="v5" className="feloral-topbar-final" dir="ltr">
        <div data-feloral-topbar-side="shipping" dir="rtl" style={{ color: accentColor }}>
          <DraggableHeaderItem
            id="top.shippingNotice"
            editorMode={editorMode}
            layout={layout}
            onStartDrag={startDrag}
            className="inline-flex"
            title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
          >
            <CmsEditMarker
              cmsKey="site.top.shippingNotice"
              sectionKey="site.header"
              label="اطلاعیه ارسال"
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
          </DraggableHeaderItem>
        </div>

        <div data-feloral-topbar-side="links" dir="rtl">
          {topLinks.map((link, index) => {
            const cmsKey = topLinkKeyMap[link.href] || `site.top.link.${index + 1}`;
            const label = getText(liveCms, cmsKey, link.label);

            return (
              <DraggableHeaderItem
                key={link.href}
                id={`top.link.${index + 1}`}
                editorMode={editorMode}
                layout={layout}
                onStartDrag={startDrag}
                className="inline-flex"
                title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
              >
                <CmsEditMarker
                  cmsKey={cmsKey}
                  sectionKey="site.header"
                  label={`Ù„ÛŒÙ†Ú© Ø¨Ø§Ù„Ø§ÛŒ Ù‡Ø¯Ø± ${link.label}`}
                  value={label}
                >
                  <a
                    href={link.href}
                    className="transition"
                    onClick={(event) => {
                      if (editorMode) event.preventDefault();
                    }}
                  >
                    {label}
                  </a>
                </CmsEditMarker>
              </DraggableHeaderItem>
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
            <DraggableHeaderItem
              id="main.cart"
              editorMode={editorMode}
              layout={layout}
              onStartDrag={startDrag}
              className="inline-flex"
              title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
            >
              <Link
                data-feloral-header-cart="left"
                href="/cart"
                onClick={(event) => {
                  if (editorMode) event.preventDefault();
                }}
                className="relative flex items-center gap-2 text-sm font-bold text-white/88 transition hover:opacity-80"
              >
                <ShoppingCart size={26} strokeWidth={1.6} />
                <span>
                  <CmsEditMarker cmsKey="site.header.cartLabel" sectionKey="site.header" label="Ø¨Ø±Ú†Ø³Ø¨ Ø³Ø¨Ø¯ Ø®Ø±ÛŒØ¯">
                    {cartLabel}
                  </CmsEditMarker>
                </span>
                <span
                  className="absolute -top-3 right-4 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  Û³
                </span>
              </Link>
            </DraggableHeaderItem>

            <DraggableHeaderItem
              id="main.account"
              editorMode={editorMode}
              layout={layout}
              onStartDrag={startDrag}
              className="inline-flex"
              title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
            >
              <Link
                href="/account"
                onClick={(event) => {
                  if (editorMode) event.preventDefault();
                }}
                className="flex items-center gap-2 text-sm font-bold text-white/88 transition hover:opacity-80"
              >
                <UserRound size={25} strokeWidth={1.6} />
                <span>
                  <CmsEditMarker cmsKey="site.header.loginLabel" sectionKey="site.header" label="Ø¨Ø±Ú†Ø³Ø¨ ÙˆØ±ÙˆØ¯ Ùˆ Ø«Ø¨Øªâ€ŒÙ†Ø§Ù…">
                    {loginLabel}
                  </CmsEditMarker>
                </span>
              </Link>
            </DraggableHeaderItem>

            <DraggableHeaderItem
              id="main.search"
              editorMode={editorMode}
              layout={layout}
              onStartDrag={startDrag}
              className="relative hidden w-[330px] xl:block"
              title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
            >
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={22} strokeWidth={1.5} />
              <input
                className="h-[52px] w-full rounded-xl border border-white/16 bg-white/[.035] pr-12 text-sm text-white outline-none transition placeholder:text-white/43"
                placeholder={searchPlaceholder}
                readOnly={editorMode}
              />
            </DraggableHeaderItem>
          </div>

          <div className="relative z-[999998] flex items-center justify-center text-center" style={logoSlotStyle}>
            <DraggableHeaderItem
              id="main.logo"
              editorMode={editorMode}
              layout={layout}
              onStartDrag={startDrag}
              className="inline-flex min-w-[190px] items-center justify-center text-center"
              title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†Ø› Ø¯ÙˆØ¨Ø§Ø± Ú©Ù„ÛŒÚ© Ø¨Ø±Ø§ÛŒ ÙˆÛŒØ±Ø§ÛŒØ´"
            >
              {editorMode ? (
                <button
                  type="button"
                  className="flex min-w-[190px] flex-col items-center justify-center text-center"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openLogoEditor();
                  }}
                >
                  {logoImage ? (
                    <img src={logoImage} alt={logoTitle || "Feloral"} className="object-contain" style={logoImageStyle} />
                  ) : (
                    <span className="font-black tracking-[-0.05em] text-white" style={logoTextStyle}>
                      <CmsEditMarker cmsKey={LOGO_CMS_KEY} sectionKey="site.logo" label="Ù„ÙˆÚ¯Ùˆ">
                        {logoTitle}
                      </CmsEditMarker>
                    </span>
                  )}
                </button>
              ) : (
                <Link href="/" className="flex min-w-[190px] flex-col items-center justify-center text-center">
                  {logoImage ? (
                    <img src={logoImage} alt={logoTitle || "Feloral"} className="object-contain" style={logoImageStyle} />
                  ) : (
                    <span className="font-black tracking-[-0.05em] text-white" style={logoTextStyle}>
                      <CmsEditMarker cmsKey={LOGO_CMS_KEY} sectionKey="site.logo" label="Ù„ÙˆÚ¯Ùˆ">
                        {logoTitle}
                      </CmsEditMarker>
                    </span>
                  )}
                </Link>
              )}
            </DraggableHeaderItem>

            {editorMode ? (
              <button
                type="button"
                onPointerDown={startLogoResize}
                className="absolute -right-8 top-1/2 z-[999999] grid h-7 w-7 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-[#d6a84f]/70 bg-black/90 text-[14px] font-black text-[#f7e6bd] shadow-xl"
                title="Ø¨Ø±Ø§ÛŒ ØªØºÛŒÛŒØ± Ø³Ø§ÛŒØ² Ù„ÙˆÚ¯Ùˆ Ø¨Ú©Ø´"
              >
                â†”
              </button>
            ) : null}

            {editorMode && logoEditorOpen ? (
              <div className="absolute left-1/2 top-full z-[999999] mt-5 max-h-[calc(100vh-160px)] w-[340px] -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/12 bg-[#090909] p-4 text-right shadow-2xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setLogoEditorOpen(false)}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-white/70 hover:text-white"
                  >
                    Ø¨Ø³ØªÙ†
                  </button>

                  <div>
                    <p className="text-sm font-black text-white">ÙˆÛŒØ±Ø§ÛŒØ´ Ù„ÙˆÚ¯Ùˆ</p>
                    <p className="mt-1 text-[11px] text-white/50">Ù…ØªÙ†ØŒ Ø¹Ú©Ø³ØŒ Ø³Ø§ÛŒØ² Ùˆ Ø¬Ø§ÛŒ Ù„ÙˆÚ¯Ùˆ</p>
                  </div>
                </div>

                <label className="block text-[12px] font-bold text-white/70">
                  Ù…ØªÙ† Ù„ÙˆÚ¯Ùˆ
                  <input
                    value={draftLogoText}
                    onChange={(event) => setDraftLogoText(event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-white/12 bg-white/[.04] px-3 text-right text-sm text-white outline-none"
                    placeholder="Ù…Ø«Ù„Ø§Ù‹ FELORAL"
                    disabled={logoSaving}
                  />
                </label>

                <button
                  type="button"
                  onClick={saveLogoText}
                  disabled={logoSaving}
                  className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-black text-black disabled:opacity-60"
                  style={{ backgroundColor: accentColor }}
                >
                  Ø°Ø®ÛŒØ±Ù‡ Ù…ØªÙ† Ù„ÙˆÚ¯Ùˆ
                </button>

                <div className="my-4 h-px bg-white/10" />

                <label className="block cursor-pointer rounded-xl border border-dashed border-white/20 bg-white/[.035] px-4 py-4 text-center text-sm font-bold text-white/80 hover:bg-white/[.06]">
                  Ø¢Ù¾Ù„ÙˆØ¯ Ù…Ø³ØªÙ‚ÛŒÙ… Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoSaving}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      void saveLogoImage(file);
                      event.target.value = "";
                    }}
                  />
                </label>

                <div className="mt-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
                  <p className="mb-2 text-[11px] font-bold text-white/55">ÛŒØ§ Ø¨Ø§ Ø¢Ù¾Ù„ÙˆØ¯Ø± Ø§ØµÙ„ÛŒ CMS:</p>
                  <CmsImageEditButton
                    cmsKey={LOGO_CMS_KEY}
                    sectionKey="site.logo"
                    label="Ø§Ù†ØªØ®Ø§Ø¨/Ø¢Ù¾Ù„ÙˆØ¯ Ø¹Ú©Ø³ Ù„ÙˆÚ¯Ùˆ"
                    currentUrl={logoImage}
                    className="static"
                  />
                  {logoImage ? (
                    <button
                      type="button"
                      onClick={saveCurrentLogoImage}
                      disabled={logoSaving}
                      className="mt-3 w-full rounded-xl border border-white/15 px-4 py-2 text-sm font-black text-white/85 disabled:opacity-60"
                    >
                      Ø°Ø®ÛŒØ±Ù‡ Ù‡Ù…ÛŒÙ† Ø¹Ú©Ø³ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒØ´Ù‡
                    </button>
                  ) : null}
                </div>

                <div className="my-4 h-px bg-white/10" />

                <label className="block text-[12px] font-bold text-white/70">
                  Ø³Ø§ÛŒØ² Ù„ÙˆÚ¯Ùˆ: {logoSize}px
                  <input
                    type="range"
                    min={MIN_LOGO_SIZE}
                    max={MAX_LOGO_SIZE}
                    value={logoSize}
                    onChange={(event) => updateLogoSizeLocal(Number(event.target.value))}
                    onPointerUp={(event) => void persistLogoSize(Number(event.currentTarget.value))}
                    className="mt-3 w-full"
                  />
                </label>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void persistLogoSize(logoSize - 10)}
                    className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-black text-white/80"
                  >
                    Ú©ÙˆÚ†Ú©â€ŒØªØ±
                  </button>

                  <button
                    type="button"
                    onClick={() => void persistLogoSize(logoSize + 10)}
                    className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-black text-white/80"
                  >
                    Ø¨Ø²Ø±Ú¯â€ŒØªØ±
                  </button>

                  <button
                    type="button"
                    onClick={() => void resetLogoSize()}
                    className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-black text-white/80"
                  >
                    Ø±ÛŒØ³Øª Ø³Ø§ÛŒØ²
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void resetOne("main.logo")}
                    className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-black text-white/80"
                  >
                    Ø±ÛŒØ³Øª Ø¬Ø§ÛŒ Ù„ÙˆÚ¯Ùˆ
                  </button>

                  <button
                    type="button"
                    onClick={clearLocalLogo}
                    className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-black text-white/70"
                  >
                    Ù¾Ø§Ú© Ú©Ø±Ø¯Ù† Ú©Ø´ Ù„ÙˆÚ¯Ùˆ
                  </button>
                </div>

                {logoStatus ? (
                  <p className="mt-3 rounded-xl bg-white/[.04] px-3 py-2 text-[12px] font-bold text-white/75">
                    {logoStatus}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <nav data-feloral-header-nav="right" className="flex items-center justify-end gap-12 text-[15px] font-bold">
            {nav.map((item, index) => {
              const cmsKey = navKeyMap[item.href] || `site.nav.${index + 1}`;
              const label = getText(liveCms, cmsKey, item.label);

              return (
                <DraggableHeaderItem
                  key={item.href}
                  id={`nav.${index + 1}`}
                  editorMode={editorMode}
                  layout={layout}
                  onStartDrag={startDrag}
                  className="inline-flex"
                  title="Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø± Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†"
                >
                  <Link
                    href={item.href}
                    onClick={(event) => {
                      if (editorMode) event.preventDefault();
                    }}
                    className="group relative py-3 text-white/88 transition hover:opacity-80"
                  >
                    <CmsEditMarker cmsKey={cmsKey} sectionKey="site.header" label={`Ù…Ù†Ùˆ ${item.label}`}>
                      {label}
                    </CmsEditMarker>
                    <span
                      className={`absolute -bottom-1 right-0 h-[2px] rounded-full transition-all ${
                        index === 0 ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                      style={{ backgroundColor: accentColor }}
                    />
                  </Link>
                </DraggableHeaderItem>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

