"use client";

import { Image as ImageIcon } from "lucide-react";
import { useCmsEditor } from "./cms-editor-provider";

type Props = {
  cmsKey: string;
  label: string;
  sectionKey?: string;
  currentUrl?: string;
  className?: string;
};

export function CmsImageEditButton({ cmsKey, label, sectionKey, currentUrl = "", className = "" }: Props) {
  const { enabled, selected, selectItem } = useCmsEditor();

  if (!enabled) {
    return null;
  }

  const isSelected = selected?.key === cmsKey;

  return (
    <button
      type="button"
      data-cms-selected={isSelected ? "true" : "false"}
      className={`cms-image-edit-button ${className}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        selectItem({
          key: cmsKey,
          label,
          type: "image",
          sectionKey,
          value: currentUrl
        });
      }}
    >
      <ImageIcon size={15} />
      {label}
    </button>
  );
}
