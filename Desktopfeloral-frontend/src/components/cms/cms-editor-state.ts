export const EDITOR_MODE_KEY = "feloral_editor_mode";
export const ADMIN_TOKEN_KEY = "feloral_admin_token";

export function isBrowser() {
  return typeof window !== "undefined";
}

export function readEditorModeFromBrowser() {
  if (!isBrowser()) return false;

  const url = new URL(window.location.href);

  if (url.searchParams.get("editor") === "1") {
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

  window.dispatchEvent(new CustomEvent("feloral-editor-state", { detail: { enabled } }));
}

export function readAdminToken() {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function saveAdminToken(token: string) {
  if (!isBrowser()) return;

  const cleanToken = token.trim();

  if (cleanToken) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, cleanToken);
  }

  window.dispatchEvent(new CustomEvent("feloral-editor-token"));
}

export function clearAdminToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("feloral-editor-token"));
}
