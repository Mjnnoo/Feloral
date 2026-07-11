import type { CmsHomepageResponse } from "./types";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

export async function getPublicHomepage(): Promise<CmsHomepageResponse | null> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/cms/public/homepage`, {
      cache: "no-store"
    });

    if (!response.ok) {
      console.error("Feloral CMS homepage fetch failed:", response.status, response.statusText);
      return null;
    }

    return (await response.json()) as CmsHomepageResponse;
  } catch (error) {
    console.error("Feloral CMS homepage fetch error:", error);
    return null;
  }
}
