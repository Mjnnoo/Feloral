export const EDITOR_MODE_KEY = "feloral_editor_mode";
export const ADMIN_TOKEN_KEY = "feloral_admin_token";

const LEGACY_ADMIN_TOKEN_KEYS = [
  ADMIN_TOKEN_KEY,
  "feloral.admin.token",
  "feloral.admin.accessToken",
  "feloralAdminToken",
  "adminToken",
  "accessToken",
  "token",
];

export function isBrowser() {
  return typeof window !== "undefined";
}

export function readEditorModeFromBrowser() {
  if (!isBrowser()) return false;

  const url = new URL(window.location.href);
  const requested =
    url.searchParams.get("editor") === "1" ||
    url.searchParams.get("admin") === "1" ||
    window.location.pathname.startsWith("/admin");

  if (requested) {
    window.localStorage.setItem(EDITOR_MODE_KEY, "1");
    return true;
  }

  return window.localStorage.getItem(EDITOR_MODE_KEY) === "1";
}

export function setEditorModeInBrowser(enabled: boolean) {
  if (!isBrowser()) return;

  if (enabled) {
    window.localStorage.setItem(EDITOR_MODE_KEY, "1");
    document.body.classList.add("cms-debug");
  } else {
    window.localStorage.removeItem(EDITOR_MODE_KEY);
    document.body.classList.remove("cms-debug");
  }

  window.dispatchEvent(
    new CustomEvent("feloral-editor-state", {
      detail: { enabled },
    }),
  );
}

function removeLegacyAdminTokens() {
  if (!isBrowser()) return;

  for (const key of LEGACY_ADMIN_TOKEN_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // LocalStorage may be unavailable in restricted browser modes.
    }
  }
}

/**
 * Kept only for compatibility with older components.
 * Secure admin tokens now live exclusively in httpOnly cookies.
 */
export function readAdminToken() {
  removeLegacyAdminTokens();
  return "";
}

/**
 * Kept only for compatibility. The supplied token is intentionally ignored.
 */
export function saveAdminToken(_token: string) {
  removeLegacyAdminTokens();
  window.dispatchEvent(new CustomEvent("feloral-editor-token"));
}

export function clearAdminToken() {
  removeLegacyAdminTokens();
  window.dispatchEvent(new CustomEvent("feloral-editor-token"));
}
