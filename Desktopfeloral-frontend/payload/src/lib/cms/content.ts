import type { CmsEditableContent, CmsHomepageResponse, CmsHomepageSection } from "./types";
import { toAbsoluteAssetUrl } from "./url";

export function getSection(cms: CmsHomepageResponse | null, key: string): CmsHomepageSection | null {
  return cms?.sections.find((section) => section.key === key) || null;
}

export function getContent(cms: CmsHomepageResponse | null, key: string): CmsEditableContent | null {
  return cms?.sections.flatMap((section) => section.contents).find((content) => content.key === key) || null;
}

export function getText(cms: CmsHomepageResponse | null, key: string, fallback: string) {
  return getContent(cms, key)?.plainText || fallback;
}

function valueToUrl(value: unknown) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "url" in value) {
    return String((value as { url?: unknown }).url || "");
  }

  return "";
}

export function getImageUrl(cms: CmsHomepageResponse | null, key: string, fallback: string) {
  const content = getContent(cms, key);

  if (content?.media?.url) {
    return toAbsoluteAssetUrl(content.media.url);
  }

  const url = valueToUrl(content?.value);

  return toAbsoluteAssetUrl(url || fallback);
}

export function getSectionTitle(cms: CmsHomepageResponse | null, key: string, fallback: string) {
  return getSection(cms, key)?.title || fallback;
}
