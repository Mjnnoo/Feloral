export const ADMIN_TOKEN_KEY =
  "feloral.admin.token";

const LEGACY_ADMIN_TOKEN_KEYS = [
  ADMIN_TOKEN_KEY,
  "feloral.admin.accessToken",
  "feloralAdminToken",
  "adminToken",
  "accessToken",
  "token",
];

export function getStoredAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of LEGACY_ADMIN_TOKEN_KEYS) {
    try {
      const value =
        window.localStorage.getItem(key);

      if (value) {
        return value;
      }
    } catch {
      // LocalStorage ممکن است در بعضی مرورگرها مسدود باشد.
    }
  }

  return "";
}

export function hasAdminToken(): boolean {
  return Boolean(getStoredAdminToken());
}

export function setAdminSession(
  token: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of LEGACY_ADMIN_TOKEN_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ادامه می‌دهیم.
    }
  }

  window.localStorage.setItem(
    ADMIN_TOKEN_KEY,
    token,
  );

  // حذف Cookie قدیمی و قابل‌جعل
  document.cookie =
    "feloral_admin=; path=/; max-age=0; SameSite=Lax";
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of LEGACY_ADMIN_TOKEN_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ادامه می‌دهیم.
    }
  }

  document.cookie =
    "feloral_admin=; path=/; max-age=0; SameSite=Lax";
}

export function isEditorRequested(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(
    window.location.search,
  );

  return (
    params.get("editor") === "1" ||
    params.get("admin") === "1" ||
    window.location.pathname.startsWith(
      "/admin",
    )
  );
}

export function canUseCmsEditor(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    isEditorRequested() &&
    hasAdminToken()
  );
}

export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  return (
    fromEnv || "http://localhost:3000"
  ).replace(/\/$/, "");
}