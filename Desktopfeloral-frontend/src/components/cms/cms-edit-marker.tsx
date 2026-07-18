"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useCmsEditor } from "./cms-editor-provider";
import { getCmsLocalStyle, type CmsLocalStyle } from "./cms-local-style";

type Props = {
  cmsKey: string;
  children: ReactNode;
  className?: string;
  label?: string;
  sectionKey?: string;
  type?: "text" | "image" | "section" | "theme";
};

function reactNodeToText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(reactNodeToText).join("");
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

export function CmsEditMarker({
  cmsKey,
  children,
  className,
  label,
  sectionKey,
  type = "text"
}: Props) {
  const { enabled, selected, selectItem, getContentByKey } = useCmsEditor();

  const isSelected = selected?.key === cmsKey;
  const content = getContentByKey(cmsKey);
  const [localStyle, setLocalStyle] = useState<CmsLocalStyle>({});

  useEffect(() => {
    setLocalStyle(getCmsLocalStyle(cmsKey));

    const onStyle = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === cmsKey) {
        setLocalStyle(detail.style || {});
      }
    };

    window.addEventListener("feloral-cms-local-style", onStyle);

    return () => {
      window.removeEventListener("feloral-cms-local-style", onStyle);
    };
  }, [cmsKey]);

  const style: CSSProperties = useMemo(() => {
    const fontFamily = localStyle.fontFamily || content?.fontFamily || "";
    const fontWeight = localStyle.fontWeight || content?.fontWeight || "";
    const fontSize = localStyle.fontSize || getFontSizeFromValue(content?.value) || "";
    const color = localStyle.color || content?.color || "";

    const computed: CSSProperties = {};

    if (fontFamily) computed.fontFamily = `"${fontFamily}", var(--font-main)`;
    if (fontWeight) computed.fontWeight = fontWeight as CSSProperties["fontWeight"];
    if (fontSize) computed.fontSize = `${fontSize}px`;
    if (color) computed.color = color;

    return computed;
  }, [content?.color, content?.fontFamily, content?.fontWeight, content?.value, localStyle]);

  const onClick = (event: React.MouseEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();

    selectItem({
      key: cmsKey,
      label: label || content?.title || cmsKey,
      type,
      sectionKey,
      value: content?.plainText || reactNodeToText(children)
    });
  };

  return (
    <span
      data-cms-key={cmsKey}
      data-cms-selected={isSelected ? "true" : "false"}
      className={`cms-edit-marker ${enabled ? "cms-edit-marker--enabled" : ""} ${className || ""}`}
      style={style}
      onClick={onClick}
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : undefined}
    >
      {children}
    </span>
  );
}
