"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { toAbsoluteAssetUrl, getApiBaseUrl } from "@/lib/cms/url";
import { useCmsEditor } from "./cms-editor-provider";
import { getCmsLocalStyle } from "./cms-local-style";

const editorFonts = [
  "Vazirmatn",
  "Lalezar",
  "Changa",
  "Cairo",
  "Tajawal",
  "Noto Naskh Arabic",
  "Noto Sans Arabic",
  "Amiri",
  "Markazi Text",
  "Arial",
  "Tahoma",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Trebuchet MS",
  "Verdana",
  "Impact",
  "Comic Sans MS",
  "Segoe UI",
  "system-ui"
];

function valueToUrl(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "url" in value) {
    return String((value as { url?: unknown }).url || "");
  }

  return "";
}

function getFontSizeFromValue(value: unknown) {
  if (value && typeof value === "object" && "fontSize" in value) {
    const raw = (value as { fontSize?: unknown }).fontSize;
    return raw ? String(raw) : "";
  }

  return "";
}

function normalizeMediaUrl(payload: unknown): { url: string; id: number | null } {
  const data = payload as any;

  const possible =
    data?.url ||
    data?.data?.url ||
    data?.media?.url ||
    data?.asset?.url ||
    data?.file?.url ||
    data?.path ||
    data?.data?.path;

  const id =
    data?.id ||
    data?.data?.id ||
    data?.media?.id ||
    data?.asset?.id ||
    null;

  return {
    url: toAbsoluteAssetUrl(possible ? String(possible) : ""),
    id: id ? Number(id) : null
  };
}

export function CmsEditorSidebar() {
  const {
    enabled,
    selected,
    token,
    status,
    saving,
    content,
    closePanel,
    setToken,
    saveSelectedContent
  } = useCmsEditor();

  const currentValue = useMemo(() => {
    if (selected?.type === "image") {
      return toAbsoluteAssetUrl(content?.media?.url || valueToUrl(content?.value) || selected?.value || "");
    }

    return content?.plainText || selected?.value || "";
  }, [content, selected]);

  const [draft, setDraft] = useState(currentValue);
  const [imageUrl, setImageUrl] = useState(currentValue);
  const [uploadedMediaId, setUploadedMediaId] = useState<number | null>(content?.mediaId || null);
  const [localToken, setLocalToken] = useState(token);
  const [fontFamily, setFontFamily] = useState("");
  const [fontWeight, setFontWeight] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [color, setColor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    const savedStyle = selected?.key ? getCmsLocalStyle(selected.key) : {};

    setDraft(currentValue);
    setImageUrl(currentValue);
    setUploadedMediaId(content?.mediaId || null);
    setFontFamily(savedStyle.fontFamily || content?.fontFamily || "");
    setFontWeight(savedStyle.fontWeight || content?.fontWeight || "");
    setFontSize(savedStyle.fontSize || getFontSizeFromValue(content?.value) || "");
    setColor(savedStyle.color || content?.color || "");
    setLocalMessage("");
  }, [
    currentValue,
    content?.fontFamily,
    content?.fontWeight,
    content?.color,
    content?.mediaId,
    content?.value,
    selected?.key
  ]);

  useEffect(() => {
    setLocalToken(token);
  }, [token]);

  if (!enabled || !selected) {
    return null;
  }

  const cleanToken = localToken.trim();
  const sliderWeight = Number(fontWeight || 400);
  const sliderSize = Number(fontSize || 16);

  const uploadFile = async (file: File) => {
    if (!cleanToken) {
      setLocalMessage("اول access_token ادمین را وارد کن.");
      return;
    }

    setUploading(true);
    setLocalMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${getApiBaseUrl()}/cms/admin/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanToken}`
        },
        body: formData
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setLocalMessage(payload?.message ? JSON.stringify(payload.message) : "آپلود تصویر انجام نشد.");
        return;
      }

      const media = normalizeMediaUrl(payload);

      if (!media.url) {
        setLocalMessage("آپلود انجام شد ولی آدرس عکس در خروجی پیدا نشد.");
        return;
      }

      setImageUrl(media.url);
      setUploadedMediaId(media.id);
      setLocalMessage("عکس آپلود شد. پیش‌نمایش را ببین و بعد ذخیره تغییرات را بزن.");
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "خطای ناشناخته در آپلود");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setToken(cleanToken);

    if (selected.type === "image") {
      await saveSelectedContent({
        type: "image",
        plainText: selected.label || selected.key,
        value: imageUrl,
        mediaId: uploadedMediaId
      });
      return;
    }

    await saveSelectedContent({
      type: "text",
      plainText: draft,
      fontFamily,
      fontWeight,
      fontSize,
      color
    });
  };

  const resetDesign = () => {
    setFontFamily("");
    setFontWeight("");
    setFontSize("");
    setColor("");
  };

  const textPreview = draft || "پیش‌نمایش متن انتخاب‌شده";

  return (
    <aside className="cms-editor-sidebar" dir="rtl">
      <div className="cms-editor-sidebar__top">
        <div>
          <p className="cms-editor-sidebar__eyebrow">Feloral Visual Editor</p>
          <h3>{selected.type === "image" ? "ویرایش تصویر" : "ویرایش محتوا و طراحی"}</h3>
        </div>

        <button type="button" onClick={closePanel} className="cms-editor-sidebar__close" aria-label="close editor panel">
          <X size={20} />
        </button>
      </div>

      <div className="cms-editor-sidebar__selected-box">
        <span>کلید محتوا</span>
        <code>{selected.key}</code>
      </div>

      <div className="cms-editor-sidebar__meta">
        <div>
          <span>نوع</span>
          <strong>{selected.type}</strong>
        </div>
        <div>
          <span>وضعیت</span>
          <strong>{content?.isPublic === false ? "مخفی" : "عمومی"}</strong>
        </div>
      </div>

      {selected.type !== "image" ? (
        <>
          <label className="cms-editor-sidebar__field">
            <span>متن</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={7}
              placeholder="متن جدید را وارد کن"
            />
          </label>

          <div className="cms-editor-sidebar__field">
            <span>طراحی متن</span>
          </div>

          <label className="cms-editor-sidebar__field">
            <span>فونت همین آیتم</span>
            <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
              <option value="">حالت پیش‌فرض سایت</option>
              {editorFonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>

          <div className="cms-editor-sidebar__field">
            <span>ضخامت فونت</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, background: "rgba(255,255,255,.055)", padding: "14px 12px" }}>
              <input type="range" min="100" max="900" step="10" value={sliderWeight} onChange={(event) => setFontWeight(event.target.value)} style={{ width: "100%", accentColor: "#d6a84f", cursor: "pointer" }} />
              <strong style={{ direction: "ltr", textAlign: "center", color: fontWeight ? "#f3d590" : "rgba(255,255,255,.55)", fontSize: 13 }}>{fontWeight || "Default"}</strong>
            </div>
            <button type="button" onClick={() => setFontWeight("")} className="cms-editor-sidebar__reset" style={{ marginTop: 10 }}>
              ضخامت پیش‌فرض
            </button>
          </div>

          <div className="cms-editor-sidebar__field">
            <span>سایز فونت</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, background: "rgba(255,255,255,.055)", padding: "14px 12px" }}>
              <input type="range" min="8" max="96" step="1" value={sliderSize} onChange={(event) => setFontSize(event.target.value)} style={{ width: "100%", accentColor: "#d6a84f", cursor: "pointer" }} />
              <strong style={{ direction: "ltr", textAlign: "center", color: fontSize ? "#f3d590" : "rgba(255,255,255,.55)", fontSize: 13 }}>{fontSize ? `${fontSize}px` : "Default"}</strong>
            </div>
            <button type="button" onClick={() => setFontSize("")} className="cms-editor-sidebar__reset" style={{ marginTop: 10 }}>
              سایز پیش‌فرض
            </button>
          </div>

          <label className="cms-editor-sidebar__field">
            <span>رنگ متن</span>
            <div className="cms-editor-sidebar__color-row">
              <input type="color" value={color || "#ffffff"} onChange={(event) => setColor(event.target.value)} />
              <input value={color} onChange={(event) => setColor(event.target.value)} placeholder="#ffffff" dir="ltr" />
            </div>
          </label>

          <button type="button" onClick={resetDesign} className="cms-editor-sidebar__reset">
            برگشت طراحی به حالت پیش‌فرض
          </button>

          <div
            className="cms-editor-sidebar__preview"
            style={{
              fontFamily: fontFamily ? `"${fontFamily}", var(--font-main)` : undefined,
              fontWeight: fontWeight || undefined,
              fontSize: fontSize ? `${fontSize}px` : undefined,
              color: color || undefined
            }}
          >
            {textPreview}
          </div>

          <label className="cms-editor-sidebar__field">
            <span>Access Token ادمین</span>
            <textarea
              value={localToken}
              onChange={(event) => setLocalToken(event.target.value)}
              rows={4}
              placeholder="access_token را بدون Bearer وارد کن"
              dir="ltr"
            />
          </label>
        </>
      ) : (
        <>
          <label className="cms-editor-sidebar__field">
            <span>آپلود عکس از کامپیوتر</span>
            <label className="cms-editor-sidebar__upload">
              <Upload size={18} />
              <strong>{uploading ? "در حال آپلود..." : "انتخاب عکس از کامپیوتر"}</strong>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file);
                }}
              />
            </label>
          </label>

          <label className="cms-editor-sidebar__field">
            <span>آدرس تصویر</span>
            <textarea
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(toAbsoluteAssetUrl(event.target.value));
                setUploadedMediaId(null);
              }}
              rows={4}
              placeholder="/products/hero-perfume.png یا لینک کامل عکس"
              dir="ltr"
            />
          </label>

          {imageUrl ? (
            <div className="cms-editor-sidebar__image-preview">
              <img src={imageUrl} alt={selected.label || selected.key} />
            </div>
          ) : null}

          <label className="cms-editor-sidebar__field">
            <span>Access Token ادمین</span>
            <textarea
              value={localToken}
              onChange={(event) => setLocalToken(event.target.value)}
              rows={4}
              placeholder="access_token را بدون Bearer وارد کن"
              dir="ltr"
            />
          </label>
        </>
      )}

      {localMessage ? <p className="cms-editor-sidebar__status">{localMessage}</p> : null}
      {status ? <p className="cms-editor-sidebar__status">{status}</p> : null}

      <div className="cms-editor-sidebar__actions">
        <button type="button" onClick={save} disabled={saving || uploading} className="cms-editor-sidebar__save">
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>

        <button type="button" onClick={closePanel} className="cms-editor-sidebar__cancel">
          بستن پنل
        </button>
      </div>
    </aside>
  );
}
