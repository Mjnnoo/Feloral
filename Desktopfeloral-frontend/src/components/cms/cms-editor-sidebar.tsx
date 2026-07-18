"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { toAbsoluteAssetUrl } from "@/lib/cms/url";
import { adminFetch } from "@/lib/admin-fetch";
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
  "system-ui",
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

function normalizeMediaUrl(payload: unknown): {
  url: string;
  id: number | null;
} {
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
    data?.id || data?.data?.id || data?.media?.id || data?.asset?.id || null;

  return {
    url: toAbsoluteAssetUrl(possible ? String(possible) : ""),
    id: id ? Number(id) : null,
  };
}

// FELORAL_HERO_ADVANCED_PANEL_START
function HeroImageDeletePanel({ selectedKey }: { selectedKey: string }) {
  const heroSlides = [
    { index: 0, backgroundKey: "home.hero.backgroundImage" },
    { index: 1, backgroundKey: "home.hero.backgroundImage2" },
    { index: 2, backgroundKey: "home.hero.backgroundImage3" },
    { index: 3, backgroundKey: "home.hero.backgroundImage4" },
  ];

  const currentSlide = heroSlides.find(
    (slide) => slide.backgroundKey === selectedKey,
  );
  const deletedSlotsKey = "feloral.hero.component.deletedSlots.v2";
  const overridesKey = "feloral.hero.component.slideOverrides.v3";
  const [message, setMessage] = useState("");

  if (!currentSlide) return null;

  const deleteThisImage = async () => {
    const deleted = (() => {
      try {
        const parsed = JSON.parse(
          window.localStorage.getItem(deletedSlotsKey) || "[]",
        );
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    })();

    window.localStorage.setItem(
      deletedSlotsKey,
      JSON.stringify(
        Array.from(new Set([...deleted, currentSlide.backgroundKey])),
      ),
    );

    try {
      const overrides = JSON.parse(
        window.localStorage.getItem(overridesKey) || "{}",
      );
      if (overrides && typeof overrides === "object") {
        delete overrides[currentSlide.backgroundKey];
        window.localStorage.setItem(overridesKey, JSON.stringify(overrides));
      }
    } catch {}

    window.dispatchEvent(
      new CustomEvent("feloral:hero-slide-deleted", {
        detail: { key: currentSlide.backgroundKey },
      }),
    );

    setMessage("در حال حذف دائمی عکس همین هیرو...");

    try {
      const deleteResponse = await adminFetch(
        `/api/admin/cms/contents/${encodeURIComponent(currentSlide.backgroundKey)}`,
        {
          method: "DELETE",
          headers: {
            "X-Feloral-Image-Delete": "1",
          },
        },
      );

      if (deleteResponse.ok || deleteResponse.status === 404) {
        window.dispatchEvent(
          new CustomEvent("feloral:hero-slide-deleted", {
            detail: { key: currentSlide.backgroundKey },
          }),
        );
        setMessage("عکس همین هیرو به‌صورت دائمی حذف شد.");
        return;
      }

      const fallbackBodies = [
        { value: "", mediaId: null, plainText: "" },
        { value: "", mediaId: null },
        { value: "" },
      ];

      for (const body of fallbackBodies) {
        const response = await adminFetch(
          `/api/admin/cms/contents/${encodeURIComponent(currentSlide.backgroundKey)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-Feloral-Image-Delete": "1",
            },
            body: JSON.stringify(body),
          },
        );

        if (response.ok) {
          window.dispatchEvent(
            new CustomEvent("feloral:hero-slide-deleted", {
              detail: { key: currentSlide.backgroundKey },
            }),
          );
          setMessage("عکس همین هیرو حذف شد.");
          return;
        }
      }

      setMessage("حذف عکس در CMS انجام نشد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته در حذف عکس",
      );
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        border: "1px solid rgba(255,120,120,.35)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(90,20,20,.2)",
        display: "grid",
        gap: 10,
      }}
    >
      <strong style={{ color: "#ffd5d5", fontSize: 13 }}>
        حذف عکس هیرو {currentSlide.index + 1}
      </strong>
      <button
        type="button"
        onClick={deleteThisImage}
        style={{
          border: "1px solid rgba(255,120,120,.55)",
          borderRadius: 12,
          padding: "11px 10px",
          background: "rgba(90,20,20,.74)",
          color: "#ffecec",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        حذف عکس همین هیرو
      </button>
      {message ? (
        <p
          style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#ffd5d5" }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function TextStrokePanel({
  selectedKey,
  selectedType,
}: {
  selectedKey: string;
  selectedType: string;
}) {
  const heroImageKeys = [
    "home.hero.backgroundImage",
    "home.hero.backgroundImage2",
    "home.hero.backgroundImage3",
    "home.hero.backgroundImage4",
  ];

  const storageKey = "feloral.cms.textStroke.v1";
  const isText =
    selectedType !== "image" &&
    Boolean(selectedKey) &&
    !heroImageKeys.includes(selectedKey);

  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState("0");
  const [size, setSize] = useState("0");
  const [message, setMessage] = useState("");

  const readStrokeMap = () => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(storageKey) || "{}",
      );
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, any>)
        : {};
    } catch {
      return {};
    }
  };

  const normalizeStroke = (stroke: {
    color: string;
    width: number;
    size: number;
  }) => ({
    color: stroke.color || "#000000",
    width: Number(stroke.width) || 0,
    size: Number(stroke.size) || 0,
  });

  const writeStroke = (next: {
    color: string;
    width: number;
    size: number;
  }) => {
    if (!selectedKey) return;

    const map = readStrokeMap();
    const stroke = normalizeStroke(next);

    if (!stroke.width && !stroke.size) delete map[selectedKey];
    else map[selectedKey] = stroke;

    window.localStorage.setItem(storageKey, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("feloral:text-stroke-updated", {
        detail: { key: selectedKey, stroke },
      }),
    );
  };

  const resetLocal = () => {
    const map = readStrokeMap();
    delete map[selectedKey];
    window.localStorage.setItem(storageKey, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("feloral:text-stroke-reset", {
        detail: { key: selectedKey },
      }),
    );
  };

  useEffect(() => {
    if (!isText) return;

    const map = readStrokeMap();
    const stroke = map[selectedKey] || {};

    setColor(typeof stroke.color === "string" ? stroke.color : "#000000");
    setWidth(String(typeof stroke.width === "number" ? stroke.width : 0));
    setSize(String(typeof stroke.size === "number" ? stroke.size : 0));
    setMessage("");
  }, [selectedKey, selectedType]);

  if (!isText) return null;

  const saveCmsKey = async (key: string, value: string) => {
    const headers = {
      "Content-Type": "application/json",
    };

    const bodies = [
      { value, plainText: value, type: "text" },
      { value },
      { plainText: value },
      { text: value },
      { content: value },
    ];

    for (const body of bodies) {
      try {
        const response = await adminFetch(
          `/api/admin/cms/contents/${encodeURIComponent(key)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(body),
          },
        );

        if (response.ok) return true;
      } catch {}
    }

    const postBodies = [
      {
        key,
        sectionKey: "home.hero",
        label: key,
        type: "text",
        value,
        plainText: value,
        isPublic: true,
      },
      { key, sectionKey: "home.hero", type: "text", value },
      { key, value },
    ];

    for (const body of postBodies) {
      try {
        const response = await adminFetch("/api/admin/cms/contents", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) return true;
      } catch {}
    }

    return false;
  };

  const applyLiveStroke = (
    nextColor = color,
    nextWidth = width,
    nextSize = size,
  ) => {
    writeStroke({
      color: nextColor,
      width: Number(nextWidth) || 0,
      size: Number(nextSize) || 0,
    });
  };

  const saveStroke = async () => {
    const stroke = normalizeStroke({
      color,
      width: Number(width) || 0,
      size: Number(size) || 0,
    });
    writeStroke(stroke);
    setMessage("در حال ذخیره استروک همین متن...");
    const ok = await saveCmsKey(
      `${selectedKey}.stroke`,
      JSON.stringify(stroke),
    );
    setMessage(
      ok
        ? "استروک همین متن ذخیره شد."
        : "استروک در مرورگر ذخیره شد؛ ذخیره در CMS انجام نشد.",
    );
  };

  const resetStroke = async () => {
    setColor("#000000");
    setWidth("0");
    setSize("0");
    resetLocal();
    setMessage("در حال بازگشت به پیش‌فرض...");
    const ok = await saveCmsKey(`${selectedKey}.stroke`, "");
    setMessage(
      ok
        ? "استروک این متن به حالت پیش‌فرض برگشت."
        : "در مرورگر به پیش‌فرض برگشت؛ ذخیره در CMS انجام نشد.",
    );
  };

  return (
    <div
      style={{
        marginTop: 14,
        border: "1px solid rgba(214,168,79,.34)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(214,168,79,.08)",
        display: "grid",
        gap: 12,
      }}
    >
      <strong style={{ color: "#f3d590", fontSize: 13 }}>
        استروک همین متن انتخاب‌شده
      </strong>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,.72)",
          fontSize: 12,
          lineHeight: 1.9,
        }}
      >
        این تنظیم فقط روی همین متنی که انتخاب کردی اعمال می‌شود.
      </p>

      <label className="cms-editor-sidebar__field">
        <span>رنگ استروک</span>
        <input
          type="color"
          value={color}
          onChange={(event) => {
            setColor(event.target.value);
            applyLiveStroke(event.target.value, width, size);
          }}
        />
      </label>

      <div className="cms-editor-sidebar__field">
        <span>ضخامت استروک: {width}px</span>
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={width}
          onChange={(event) => {
            setWidth(event.target.value);
            applyLiveStroke(color, event.target.value, size);
          }}
          style={{ width: "100%", accentColor: "#d6a84f" }}
        />
      </div>

      <div className="cms-editor-sidebar__field">
        <span>سایز/هاله استروک: {size}px</span>
        <input
          type="range"
          min="0"
          max="28"
          step="1"
          value={size}
          onChange={(event) => {
            setSize(event.target.value);
            applyLiveStroke(color, width, event.target.value);
          }}
          style={{ width: "100%", accentColor: "#d6a84f" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          onClick={saveStroke}
          style={{
            border: 0,
            borderRadius: 12,
            padding: "11px 10px",
            background: "#d6a84f",
            color: "#111",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ذخیره استروک
        </button>

        <button
          type="button"
          onClick={resetStroke}
          style={{
            border: "1px solid rgba(255,255,255,.25)",
            borderRadius: 12,
            padding: "11px 10px",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          حالت پیش‌فرض
        </button>
      </div>

      {message ? (
        <p
          style={{
            margin: 0,
            minHeight: 18,
            fontSize: 12,
            fontWeight: 800,
            color: "#f3d590",
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
// FELORAL_HERO_ADVANCED_PANEL_END

export function CmsEditorSidebar() {
  const {
    enabled,
    selected,
    status,
    saving,
    content,
    closePanel,
    saveSelectedContent,
  } = useCmsEditor();

  const currentValue = useMemo(() => {
    if (selected?.type === "image") {
      return toAbsoluteAssetUrl(
        content?.media?.url ||
          valueToUrl(content?.value) ||
          selected?.value ||
          "",
      );
    }

    return content?.plainText || selected?.value || "";
  }, [content, selected]);

  const [draft, setDraft] = useState(currentValue);
  const [imageUrl, setImageUrl] = useState(currentValue);
  const [uploadedMediaId, setUploadedMediaId] = useState<number | null>(
    content?.mediaId || null,
  );
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
    setFontSize(
      savedStyle.fontSize || getFontSizeFromValue(content?.value) || "",
    );
    setColor(savedStyle.color || content?.color || "");
    setLocalMessage("");
  }, [
    currentValue,
    content?.fontFamily,
    content?.fontWeight,
    content?.color,
    content?.mediaId,
    content?.value,
    selected?.key,
  ]);

  if (!enabled || !selected) {
    return null;
  }

  const sliderWeight = Number(fontWeight || 400);
  const sliderSize = Number(fontSize || 16);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setLocalMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await adminFetch("/api/admin/cms/media/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setLocalMessage(
          payload?.message
            ? JSON.stringify(payload.message)
            : "آپلود تصویر انجام نشد.",
        );
        return;
      }

      const media = normalizeMediaUrl(payload);

      if (!media.url) {
        setLocalMessage("آپلود انجام شد ولی آدرس عکس در خروجی پیدا نشد.");
        return;
      }

      setImageUrl(media.url);
      setUploadedMediaId(media.id);
      setLocalMessage(
        "عکس آپلود شد. پیش‌نمایش را ببین و بعد ذخیره تغییرات را بزن.",
      );
    } catch (error) {
      setLocalMessage(
        error instanceof Error ? error.message : "خطای ناشناخته در آپلود",
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (selected.type === "image") {
      await saveSelectedContent({
        type: "image",
        plainText: selected.label || selected.key,
        value: imageUrl,
        mediaId: uploadedMediaId,
      });
      return;
    }

    await saveSelectedContent({
      type: "text",
      plainText: draft,
      fontFamily,
      fontWeight,
      fontSize,
      color,
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
          <h3>
            {selected.type === "image"
              ? "ویرایش تصویر"
              : "ویرایش محتوا و طراحی"}
          </h3>
        </div>

        <button
          type="button"
          onClick={closePanel}
          className="cms-editor-sidebar__close"
          aria-label="close editor panel"
        >
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

      <HeroImageDeletePanel selectedKey={selected.key} />
      <TextStrokePanel
        selectedKey={selected.key}
        selectedType={selected.type}
      />

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
            <select
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
            >
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 64px",
                alignItems: "center",
                gap: 12,
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 14,
                background: "rgba(255,255,255,.055)",
                padding: "14px 12px",
              }}
            >
              <input
                type="range"
                min="100"
                max="900"
                step="10"
                value={sliderWeight}
                onChange={(event) => setFontWeight(event.target.value)}
                style={{
                  width: "100%",
                  accentColor: "#d6a84f",
                  cursor: "pointer",
                }}
              />
              <strong
                style={{
                  direction: "ltr",
                  textAlign: "center",
                  color: fontWeight ? "#f3d590" : "rgba(255,255,255,.55)",
                  fontSize: 13,
                }}
              >
                {fontWeight || "Default"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setFontWeight("")}
              className="cms-editor-sidebar__reset"
              style={{ marginTop: 10 }}
            >
              ضخامت پیش‌فرض
            </button>
          </div>

          <div className="cms-editor-sidebar__field">
            <span>سایز فونت</span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 64px",
                alignItems: "center",
                gap: 12,
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 14,
                background: "rgba(255,255,255,.055)",
                padding: "14px 12px",
              }}
            >
              <input
                type="range"
                min="8"
                max="96"
                step="1"
                value={sliderSize}
                onChange={(event) => setFontSize(event.target.value)}
                style={{
                  width: "100%",
                  accentColor: "#d6a84f",
                  cursor: "pointer",
                }}
              />
              <strong
                style={{
                  direction: "ltr",
                  textAlign: "center",
                  color: fontSize ? "#f3d590" : "rgba(255,255,255,.55)",
                  fontSize: 13,
                }}
              >
                {fontSize ? `${fontSize}px` : "Default"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setFontSize("")}
              className="cms-editor-sidebar__reset"
              style={{ marginTop: 10 }}
            >
              سایز پیش‌فرض
            </button>
          </div>

          <label className="cms-editor-sidebar__field">
            <span>رنگ متن</span>
            <div className="cms-editor-sidebar__color-row">
              <input
                type="color"
                value={color || "#ffffff"}
                onChange={(event) => setColor(event.target.value)}
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="#ffffff"
                dir="ltr"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={resetDesign}
            className="cms-editor-sidebar__reset"
          >
            برگشت طراحی به حالت پیش‌فرض
          </button>

          <div
            className="cms-editor-sidebar__preview"
            style={{
              fontFamily: fontFamily
                ? `"${fontFamily}", var(--font-main)`
                : undefined,
              fontWeight: fontWeight || undefined,
              fontSize: fontSize ? `${fontSize}px` : undefined,
              color: color || undefined,
            }}
          >
            {textPreview}
          </div>
        </>
      ) : (
        <>
          <label className="cms-editor-sidebar__field">
            <span>آپلود عکس از کامپیوتر</span>
            <label className="cms-editor-sidebar__upload">
              <Upload size={18} />
              <strong>
                {uploading ? "در حال آپلود..." : "انتخاب عکس از کامپیوتر"}
              </strong>
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
        </>
      )}

      {localMessage ? (
        <p className="cms-editor-sidebar__status">{localMessage}</p>
      ) : null}
      {status ? <p className="cms-editor-sidebar__status">{status}</p> : null}

      <div className="cms-editor-sidebar__actions">
        <button
          type="button"
          onClick={save}
          disabled={saving || uploading}
          className="cms-editor-sidebar__save"
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>

        <button
          type="button"
          onClick={closePanel}
          className="cms-editor-sidebar__cancel"
        >
          بستن پنل
        </button>
      </div>
    </aside>
  );
}
