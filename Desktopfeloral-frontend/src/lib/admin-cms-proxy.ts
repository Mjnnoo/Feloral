import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_ROLES,
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  verifyAdminSession,
} from "@/lib/admin-session";

const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type RefreshedAdminTokens = {
  accessToken: string;
  refreshToken: string;
  refreshMaxAge: number;
  sessionToken: string;
};

function backendBaseUrl(): string {
  const value =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000";

  return value.replace(/\/$/, "");
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSetCookieValues(headers: Headers): string[] {
  const enhancedHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof enhancedHeaders.getSetCookie === "function") {
    return enhancedHeaders.getSetCookie();
  }

  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}

function readCookieFromSetCookie(headers: Headers, cookieName: string): string {
  for (const header of getSetCookieValues(headers)) {
    const match = header.match(
      new RegExp(`(?:^|,\\s*)${cookieName}=([^;]*)`, "i"),
    );

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return "";
}

function readCookieMaxAge(headers: Headers, cookieName: string): number {
  for (const header of getSetCookieValues(headers)) {
    if (!new RegExp(`(?:^|,\\s*)${cookieName}=`, "i").test(header)) {
      continue;
    }

    const match = header.match(/Max-Age=(\d+)/i);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return DEFAULT_REFRESH_MAX_AGE_SECONDS;
}

function getPayloadValue(payload: unknown, keys: string[]): unknown {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const root = payload as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

  for (const key of keys) {
    if (root[key] !== undefined) {
      return root[key];
    }

    if (nested?.[key] !== undefined) {
      return nested[key];
    }
  }

  return undefined;
}

function readAdminIdentity(payload: unknown): {
  userId: number;
  role: string;
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const rawUser =
    (root.user && typeof root.user === "object" ? root.user : null) ||
    (data?.user && typeof data.user === "object" ? data.user : null) ||
    (root.admin && typeof root.admin === "object" ? root.admin : null);

  const user = (rawUser || {}) as Record<string, unknown>;
  const userId = Number(
    user.id ?? user.userId ?? root.userId ?? data?.userId ?? 0,
  );
  const role = String(
    user.role ?? root.role ?? data?.role ?? "",
  )
    .trim()
    .toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0 || !ADMIN_ROLES.has(role)) {
    return null;
  }

  return { userId, role };
}

async function refreshAdminTokens(): Promise<RefreshedAdminTokens | null> {
  const cookieStore = await cookies();
  const currentRefreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value || "";

  if (!currentRefreshToken) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(`${backendBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${encodeURIComponent(currentRefreshToken)}`,
      },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const accessToken = String(
    getPayloadValue(payload, ["access_token", "accessToken"]) || "",
  ).trim();
  const identity = readAdminIdentity(payload);

  if (!accessToken || !identity) {
    return null;
  }

  const rotatedRefreshToken =
    readCookieFromSetCookie(response.headers, "refresh_token") ||
    String(
      getPayloadValue(payload, ["refresh_token", "refreshToken"]) || "",
    ).trim() ||
    currentRefreshToken;

  const sessionToken = await createAdminSession(
    identity.userId,
    identity.role,
  );

  return {
    accessToken,
    refreshToken: rotatedRefreshToken,
    refreshMaxAge: readCookieMaxAge(response.headers, "refresh_token"),
    sessionToken,
  };
}

function applyAdminCookies(
  response: NextResponse,
  tokens: RefreshedAdminTokens,
): void {
  const common = {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax" as const,
  };

  response.cookies.set(ADMIN_SESSION_COOKIE, tokens.sessionToken, {
    ...common,
    path: "/",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });

  response.cookies.set(ADMIN_ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    path: "/api/admin",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });

  response.cookies.set(ADMIN_REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    path: "/api/admin",
    maxAge: tokens.refreshMaxAge,
  });
}

function clearAdminCookies(response: NextResponse): void {
  const common = {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax" as const,
    maxAge: 0,
  };

  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...common,
    path: "/",
  });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    ...common,
    path: "/api/admin",
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", {
    ...common,
    path: "/api/admin",
  });
}

function sameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function unauthorizedResponse(message: string): NextResponse {
  const response = NextResponse.json(
    { message },
    { status: 401 },
  );
  clearAdminCookies(response);
  return response;
}

async function backendResponseToNextResponse(
  backendResponse: Response,
): Promise<NextResponse> {
  const body =
    backendResponse.status === 204 || backendResponse.status === 304
      ? null
      : await backendResponse.arrayBuffer();
  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-disposition",
    "location",
  ]) {
    const value = backendResponse.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set("cache-control", "no-store");

  return new NextResponse(body, {
    status: backendResponse.status,
    headers,
  });
}

/**
 * Proxies a request from a same-origin admin BFF route to the NestJS backend.
 * The browser never receives the access or refresh token.
 */
export async function proxyAdminCmsRequest(
  request: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  if (!sameOriginRequest(request)) {
    return NextResponse.json(
      { message: "درخواست از مبدا نامعتبر ارسال شده است." },
      { status: 403 },
    );
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const cookieStore = await cookies();

  let accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value || "";
  let refreshedTokens: RefreshedAdminTokens | null = null;
  const session = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!session || !accessToken) {
    refreshedTokens = await refreshAdminTokens();

    if (!refreshedTokens) {
      return unauthorizedResponse("نشست مدیریت معتبر نیست یا منقضی شده است.");
    }

    accessToken = refreshedTokens.accessToken;
  }

  const callBackend = async (token: string): Promise<Response> => {
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");

    if (contentType) headers.set("content-type", contentType);
    if (accept) headers.set("accept", accept);
    headers.set("authorization", `Bearer ${token}`);

    return fetch(`${backendBaseUrl()}${backendPath}${request.nextUrl.search}`, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  };

  let backendResponse: Response;

  try {
    backendResponse = await callBackend(accessToken);
  } catch {
    return NextResponse.json(
      { message: "ارتباط با سرویس بک‌اند برقرار نشد." },
      { status: 502 },
    );
  }

  if (backendResponse.status === 401) {
    refreshedTokens = await refreshAdminTokens();

    if (!refreshedTokens) {
      return unauthorizedResponse("نشست مدیریت منقضی شده است.");
    }

    try {
      backendResponse = await callBackend(refreshedTokens.accessToken);
    } catch {
      return NextResponse.json(
        { message: "ارتباط با سرویس بک‌اند برقرار نشد." },
        { status: 502 },
      );
    }
  }

  const response = await backendResponseToNextResponse(backendResponse);

  if (refreshedTokens) {
    applyAdminCookies(response, refreshedTokens);
  }

  if (backendResponse.status === 401) {
    clearAdminCookies(response);
  }

  return response;
}
