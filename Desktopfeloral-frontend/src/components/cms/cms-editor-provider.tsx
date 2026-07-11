"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsEditableContent, CmsHomepageResponse } from "@/lib/cms/types";
import {
  readAdminToken,
  readEditorModeFromBrowser,
  saveAdminToken,
  setEditorModeInBrowser
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
  token: string;
  status: string;
  saving: boolean;
  content: CmsEditableContent | null;
  enableEditor: () => void;
  disableEditor: () => void;
  selectItem: (item: SelectedCmsItem) => void;
  closePanel: () => void;
  setToken: (token: string) => void;
  saveSelectedContent: (input: SaveContentInput) => Promise<void>;
  getContentByKey: (key: string) => CmsEditableContent | null;
};

const CmsEditorContext = createContext<EditorContextValue | null>(null);

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

function findContent(cms: CmsHomepageResponse | null, key: string) {
  return cms?.sections.flatMap((section) => section.contents).find((item) => item.key === key) || null;
}

function removeEditorQueryFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("editor");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function applyLiveStyle(key: string, input: SaveContentInput) {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>(`[data-cms-key="${key}"]`).forEach((element) => {
    if (input.fontFamily !== undefined) {
      element.style.setProperty("font-family", input.fontFamily ? `"${input.fontFamily}", var(--font-main)` : "");
    }

    if (input.fontWeight !== undefined) {
      element.style.setProperty("font-weight", input.fontWeight || "");
    }

    if (input.fontSize !== undefined) {
      element.style.setProperty("font-size", input.fontSize ? `${input.fontSize}px` : "");
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
    "has-cms-sidebar"
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
    "transform"
  ];

  inlineProps.forEach((prop) => {
    document.body.style.removeProperty(prop);
    document.documentElement.style.removeProperty(prop);
  });
}
export function CmsEditorProvider({
  cms,
  children
}: {
  cms: CmsHomepageResponse | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<SelectedCmsItem | null>(null);
  const [token, setTokenState] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const content = useMemo(() => {
    if (!selected?.key) return null;
    return findContent(cms, selected.key);
  }, [cms, selected]);

  useEffect(() => {
    const sync = () => {
      const editorEnabled = readEditorModeFromBrowser();
      setEnabled(editorEnabled);
      setTokenState(readAdminToken());

      if (editorEnabled) {
        document.body.classList.add("cms-debug");
      } else {
        document.body.classList.remove("cms-debug");
      }
    };

    sync();

    const onEditorState = () => sync();
    const onTokenChange = () => setTokenState(readAdminToken());

    window.addEventListener("feloral-editor-state", onEditorState);
    window.addEventListener("feloral-editor-token", onTokenChange);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("feloral-editor-state", onEditorState);
      window.removeEventListener("feloral-editor-token", onTokenChange);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const enableEditor = () => {
    setEditorModeInBrowser(true);
    setEnabled(true);
    document.body.classList.add("cms-debug");
  };

  const disableEditor = () => {
    setEditorModeInBrowser(false);
    setEnabled(false);
    setSelected(null);
    setStatus("");
    document.body.classList.remove("cms-debug");
    removeEditorQueryFromUrl();
  };

  const setToken = (newToken: string) => {
    const cleanToken = newToken.trim();
    setTokenState(cleanToken);
    saveAdminToken(cleanToken);
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

  const saveSelectedContent = async (input: SaveContentInput) => {
    if (!selected) return;

    const cleanToken = token.trim();

    if (!cleanToken) {
      setStatus("اول access_token ادمین را در پنل وارد کن.");
      return;
    }

    setSaving(true);
    setStatus("");

    const contentType = input.type || (selected.type === "image" ? "image" : "text");

    const { fontSize, ...restInput } = input;

    const styleValue =
      selected.type !== "image"
        ? {
            ...(typeof input.value === "object" && input.value !== null ? input.value : {}),
            fontSize: fontSize || ""
          }
        : input.value;

    const body = {
      ...restInput,
      value: styleValue,
      type: contentType,
      title: selected.label || selected.key,
      isPublic: true,
      isEditable: true
    };

    try {
      saveAdminToken(cleanToken);

      const updateResponse = await fetch(`${getApiBaseUrl()}/cms/admin/contents/${encodeURIComponent(selected.key)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanToken}`
        },
        body: JSON.stringify(body)
      });

      if (updateResponse.ok) {
        if (selected.type !== "image") {
          setCmsLocalStyle(selected.key, {
            fontFamily: input.fontFamily || "",
            fontWeight: input.fontWeight || "",
            fontSize: input.fontSize || "",
            color: input.color || ""
          });
          applyLiveStyle(selected.key, input);
        }

        setStatus("ذخیره شد.");
        router.refresh();
        return;
      }

      if (updateResponse.status === 404) {
        const createResponse = await fetch(`${getApiBaseUrl()}/cms/admin/contents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanToken}`
          },
          body: JSON.stringify({
            key: selected.key,
            ...body
          })
        });

        if (createResponse.ok) {
          if (selected.type !== "image") {
            setCmsLocalStyle(selected.key, {
              fontFamily: input.fontFamily || "",
              fontWeight: input.fontWeight || "",
              fontSize: input.fontSize || "",
              color: input.color || ""
            });
            applyLiveStyle(selected.key, input);
          }

          setStatus("محتوای جدید ساخته و ذخیره شد.");
          router.refresh();
          return;
        }

        const createPayload = await createResponse.json().catch(() => null);
        setStatus(createPayload?.message ? JSON.stringify(createPayload.message) : "ساخت محتوا انجام نشد.");
        return;
      }

      const payload = await updateResponse.json().catch(() => null);
      setStatus(payload?.message ? JSON.stringify(payload.message) : "ذخیره انجام نشد.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "خطای ناشناخته در ذخیره");
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
        token,
        status,
        saving,
        content,
        enableEditor,
        disableEditor,
        selectItem,
        closePanel,
        setToken,
        saveSelectedContent,
        getContentByKey
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

