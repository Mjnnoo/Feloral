"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  CmsEditableContent,
  CmsHomepageResponse,
} from "@/lib/cms/types";
import { adminFetch } from "@/lib/admin-fetch";
import {
  clearAdminToken,
  readEditorModeFromBrowser,
  setEditorModeInBrowser,
} from "./cms-editor-state";
import { setCmsLocalStyle } from "./cms-local-style";

export type SelectedCmsItem = {
  key: string;
  label?: string;
  type: "text" | "image" | "section" | "theme";
  value?: string;
  sectionKey?: string;
};

type SaveContentInput = {
  plainText?: string | null;
  value?: unknown;
  mediaId?: number | null;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: string;
  color?: string;
  type?: "text" | "rich_text" | "image" | "video" | "json" | "link";
};

type EditorContextValue = {
  cms: CmsHomepageResponse | null;
  enabled: boolean;
  selected: SelectedCmsItem | null;
  /** @deprecated Tokens are stored only in httpOnly cookies. */
  token: string;
  status: string;
  saving: boolean;
  content: CmsEditableContent | null;
  enableEditor: () => void;
  disableEditor: () => void;
  selectItem: (item: SelectedCmsItem) => void;
  closePanel: () => void;
  /** @deprecated Kept for compatibility; the supplied token is ignored. */
  setToken: (token: string) => void;
  saveSelectedContent: (input: SaveContentInput) => Promise<void>;
  getContentByKey: (key: string) => CmsEditableContent | null;
};

const CmsEditorContext = createContext<EditorContextValue | null>(null);

function findContent(cms: CmsHomepageResponse | null, key: string) {
  return (
    cms?.sections
      .flatMap((section) => section.contents)
      .find((item) => item.key === key) || null
  );
}

function removeEditorQueryFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("editor");
  url.searchParams.delete("admin");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function applyLiveStyle(key: string, input: SaveContentInput) {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll<HTMLElement>(`[data-cms-key="${CSS.escape(key)}"]`)
    .forEach((element) => {
      if (input.fontFamily !== undefined) {
        element.style.setProperty(
          "font-family",
          input.fontFamily
            ? `"${input.fontFamily}", var(--font-main)`
            : "",
        );
      }

      if (input.fontWeight !== undefined) {
        element.style.setProperty("font-weight", input.fontWeight || "");
      }

      if (input.fontSize !== undefined) {
        element.style.setProperty(
          "font-size",
          input.fontSize ? `${input.fontSize}px` : "",
        );
      }

      if (input.color !== undefined) {
        element.style.setProperty("color", input.color || "");
      }
    });
}

function cleanupEditorPanelLayout() {
  if (typeof document === "undefined") return;

  const layoutClasses = [
    "cms-panel-open",
    "cms-editor-panel-open",
    "editor-panel-open",
    "cms-sidebar-open",
    "has-cms-sidebar",
  ];

  layoutClasses.forEach((className) => {
    document.body.classList.remove(className);
    document.documentElement.classList.remove(className);
  });

  const inlineProps = [
    "padding-left",
    "padding-right",
    "margin-left",
    "margin-right",
    "width",
    "max-width",
    "transform",
  ];

  inlineProps.forEach((prop) => {
    document.body.style.removeProperty(prop);
    document.documentElement.style.removeProperty(prop);
  });
}

function payloadMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const message = (payload as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.map(String).join("، ");
  }

  if (message !== undefined && message !== null) {
    return String(message);
  }

  return fallback;
}

export function CmsEditorProvider({
  cms,
  children,
}: {
  cms: CmsHomepageResponse | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<SelectedCmsItem | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const content = useMemo(() => {
    if (!selected?.key) return null;
    return findContent(cms, selected.key);
  }, [cms, selected]);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      clearAdminToken();

      const editorRequested = readEditorModeFromBrowser();

      if (!editorRequested) {
        if (!cancelled) {
          setEnabled(false);
          document.body.classList.remove("cms-debug");
        }
        return;
      }

      try {
        const response = await adminFetch("/api/admin/session", {
          method: "GET",
        });
        const payload = (await response.json().catch(() => null)) as {
          authenticated?: boolean;
        } | null;
        const authenticated = response.ok && payload?.authenticated === true;

        if (cancelled) return;

        setEnabled(authenticated);

        if (authenticated) {
          document.body.classList.add("cms-debug");
          setStatus("");
        } else {
          document.body.classList.remove("cms-debug");
          setSelected(null);
          setStatus("نشست مدیریت معتبر نیست. دوباره وارد پنل مدیریت شو.");
        }
      } catch {
        if (cancelled) return;
        setEnabled(false);
        document.body.classList.remove("cms-debug");
        setStatus("بررسی نشست مدیریت انجام نشد.");
      }
    };

    void sync();

    const onEditorState = () => void sync();
    const onStorage = () => void sync();

    window.addEventListener("feloral-editor-state", onEditorState);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("feloral-editor-state", onEditorState);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const enableEditor = () => {
    setEditorModeInBrowser(true);
  };

  const disableEditor = () => {
    setEditorModeInBrowser(false);
    setEnabled(false);
    setSelected(null);
    setStatus("");
    document.body.classList.remove("cms-debug");
    removeEditorQueryFromUrl();
  };

  const setToken = (_newToken: string) => {
    clearAdminToken();
  };

  const selectItem = (item: SelectedCmsItem) => {
    if (!enabled) return;
    setSelected(item);
    setStatus("");
  };

  const closePanel = () => {
    setSelected(null);
    setStatus("");
    cleanupEditorPanelLayout();
  };

  const getContentByKey = (key: string) => findContent(cms, key);

  const applySuccessfulTextSave = (input: SaveContentInput) => {
    if (!selected || selected.type === "image") return;

    setCmsLocalStyle(selected.key, {
      fontFamily: input.fontFamily || "",
      fontWeight: input.fontWeight || "",
      fontSize: input.fontSize || "",
      color: input.color || "",
    });
    applyLiveStyle(selected.key, input);
  };

  const saveSelectedContent = async (input: SaveContentInput) => {
    if (!selected) return;

    setSaving(true);
    setStatus("");

    const contentType =
      input.type || (selected.type === "image" ? "image" : "text");
    const { fontSize, ...restInput } = input;
    const styleValue =
      selected.type !== "image"
        ? {
            ...(typeof input.value === "object" && input.value !== null
              ? input.value
              : {}),
            fontSize: fontSize || "",
          }
        : input.value;

    const body = {
      ...restInput,
      value: styleValue,
      type: contentType,
      title: selected.label || selected.key,
      sectionKey: selected.sectionKey,
      isPublic: true,
      isEditable: true,
    };

    try {
      const updateResponse = await adminFetch(
        `/api/admin/cms/contents/${encodeURIComponent(selected.key)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (updateResponse.ok) {
        applySuccessfulTextSave(input);
        setStatus("ذخیره شد.");
        router.refresh();
        return;
      }

      if (updateResponse.status === 404) {
        const createResponse = await adminFetch("/api/admin/cms/contents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: selected.key,
            ...body,
            sectionKey: selected.sectionKey || "home.hero",
          }),
        });

        if (createResponse.ok) {
          applySuccessfulTextSave(input);
          setStatus("محتوای جدید ساخته و ذخیره شد.");
          router.refresh();
          return;
        }

        const createPayload = await createResponse.json().catch(() => null);
        setStatus(
          payloadMessage(createPayload, "ساخت محتوا انجام نشد."),
        );
        return;
      }

      if (updateResponse.status === 401) {
        setStatus("نشست مدیریت منقضی شده است. دوباره وارد پنل شو.");
        return;
      }

      const payload = await updateResponse.json().catch(() => null);
      setStatus(payloadMessage(payload, "ذخیره انجام نشد."));
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "خطای ناشناخته در ذخیره",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <CmsEditorContext.Provider
      value={{
        cms,
        enabled,
        selected,
        token: "",
        status,
        saving,
        content,
        enableEditor,
        disableEditor,
        selectItem,
        closePanel,
        setToken,
        saveSelectedContent,
        getContentByKey,
      }}
    >
      {children}
    </CmsEditorContext.Provider>
  );
}

export function useCmsEditor() {
  const context = useContext(CmsEditorContext);

  if (!context) {
    throw new Error("useCmsEditor must be used inside CmsEditorProvider");
  }

  return context;
}
