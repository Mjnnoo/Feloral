export const ADMIN_TOKEN_KEY = "feloral.admin.token";

const LEGACY_ADMIN_TOKEN_KEYS = [
  ADMIN_TOKEN_KEY,
  "feloral_admin_token",
  "feloral.admin.accessToken",
  "feloralAdminToken",
  "adminToken",
  "accessToken",
  "token",
];

function removeLegacyTokens(): void {
  if (typeof window === "undefined") return;

  for (const key of LEGACY_ADMIN_TOKEN_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // LocalStorage may be unavailable in restricted browser modes.
    }
  }

  document.cookie =
    "feloral_admin=; path=/; max-age=0; SameSite=Lax";
}

/**
 * Legacy compatibility helper. Access tokens are no longer readable by
 * browser JavaScript because they are stored in httpOnly cookies.
 */
export function getStoredAdminToken(): string {
  removeLegacyTokens();
  return "";
}

export function hasAdminToken(): boolean {
  return false;
}

/**
 * Legacy compatibility helper. The token argument is intentionally ignored.
 */
export function setAdminSession(_token: string): void {
  removeLegacyTokens();
}

export function clearAdminSession(): void {
  removeLegacyTokens();
}

export function isEditorRequested(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);

  return (
    params.get("editor") === "1" ||
    params.get("admin") === "1" ||
    window.location.pathname.startsWith("/admin") ||
    window.localStorage.getItem("feloral_editor_mode") === "1"
  );
}

/**
 * This controls only whether editor UI may be rendered. Authorization is
 * always enforced by the same-origin BFF and the signed admin session cookie.
 */
export function canUseCmsEditor(): boolean {
  return isEditorRequested();
}

export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}
