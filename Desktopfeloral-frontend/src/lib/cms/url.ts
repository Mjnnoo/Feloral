export function getApiBaseUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  return baseUrl.replace(/\/$/, "");
}

export function toAbsoluteAssetUrl(url: string | null | undefined) {
  if (!url) return "";

  const cleanUrl = String(url).trim();

  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }

  if (
    cleanUrl.startsWith("/products/") ||
    cleanUrl.startsWith("/images/") ||
    cleanUrl.startsWith("/assets/")
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("/")) {
    return `${getApiBaseUrl()}${cleanUrl}`;
  }

  return `${getApiBaseUrl()}/${cleanUrl}`;
}
