export type CmsContentType = "text" | "rich_text" | "image" | "video" | "json" | "link";
export type CmsSectionType = "hero" | "benefits" | "products" | "banner" | "brands" | "custom";
export type CmsSectionStatus = "draft" | "published" | "hidden";

export type CmsMediaAsset = {
  id?: number;
  url?: string;
  key?: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  alt?: string;
  title?: string;
};

export type CmsEditableContent = {
  id?: number;
  key: string;
  title?: string;
  type?: CmsContentType;
  plainText?: string | null;
  richText?: string | null;
  value?: unknown;
  mediaId?: number | null;
  media?: CmsMediaAsset | null;
  linkUrl?: string | null;
  color?: string | null;
  fontFamily?: string | null;
  fontWeight?: string | null;
  isPublic?: boolean;
  isEditable?: boolean;
  sectionId?: number;
};

export type CmsHomepageSection = {
  id?: number;
  key: string;
  title?: string;
  type?: CmsSectionType;
  status?: CmsSectionStatus;
  sortOrder?: number;
  isPublic?: boolean;
  isEditable?: boolean;
  contents: CmsEditableContent[];
};

export type CmsTheme = {
  id?: number;
  name?: string;
  primaryFont?: string;
  headingFont?: string;
  bodyFont?: string;
  buttonFont?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  darkColor?: string;
  logoText?: string;
  availableFonts?: string[];
};

export type CmsHomepageResponse = {
  theme?: CmsTheme;
  sections: CmsHomepageSection[];
};
