import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_ROLES,
  ADMIN_SESSION_COOKIE,
  createAdminSession,
} from "@/lib/admin-session";

export const runtime = "nodejs";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const DEFAULT_REFRESH_MAX_AGE =
  30 * 24 * 60 * 60;

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function extractRefreshToken(
  setCookieHeader: string | null,
): string {
  if (!setCookieHeader) {
    return "";
  }

  const match = setCookieHeader.match(
    /refresh_token=([^;]+)/i,
  );

  return match?.[1] ?? "";
}

function extractRefreshMaxAge(
  setCookieHeader: string | null,
): number {
  if (!setCookieHeader) {
    return DEFAULT_REFRESH_MAX_AGE;
  }

  const match = setCookieHeader.match(
    /Max-Age=(\d+)/i,
  );

  const maxAge = Number(match?.[1]);

  return Number.isFinite(maxAge) &&
    maxAge > 0
    ? maxAge
    : DEFAULT_REFRESH_MAX_AGE;
}

function clearAdminCookies(
  response: NextResponse,
) {
  const secure =
    process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/admin",
    maxAge: 0,
  });

  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/admin",
    maxAge: 0,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(
  request: NextRequest,
) {
  const currentRefreshToken =
    request.cookies.get(
      ADMIN_REFRESH_COOKIE,
    )?.value;

  if (!currentRefreshToken) {
    const response = NextResponse.json(
      {
        message:
          "نشست مدیریت یافت نشد.",
      },
      {
        status: 401,
      },
    );

    clearAdminCookies(response);

    return response;
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(
      `${getApiBaseUrl()}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Cookie:
            `refresh_token=${encodeURIComponent(
              currentRefreshToken,
            )}`,
        },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "ارتباط با سرور احراز هویت برقرار نشد.",
      },
      {
        status: 502,
      },
    );
  }

  const payload = await backendResponse
    .json()
    .catch(() => null);

  if (!backendResponse.ok) {
    const response = NextResponse.json(
      {
        message:
          "نشست مدیریت منقضی یا نامعتبر است.",
      },
      {
        status: 401,
      },
    );

    clearAdminCookies(response);

    return response;
  }

  const accessToken =
    payload &&
    typeof payload === "object" &&
    "access_token" in payload &&
    typeof payload.access_token === "string"
      ? payload.access_token
      : "";

  const user =
    payload &&
    typeof payload === "object" &&
    "user" in payload &&
    payload.user &&
    typeof payload.user === "object"
      ? payload.user
      : null;

  const userId =
    user &&
    "id" in user &&
    typeof user.id === "number"
      ? user.id
      : 0;

  const role =
    user &&
    "role" in user &&
    typeof user.role === "string"
      ? user.role.trim().toLowerCase()
      : "";

  const backendSetCookie =
    backendResponse.headers.get(
      "set-cookie",
    );

  const newRefreshToken =
    extractRefreshToken(
      backendSetCookie,
    );

  if (
    !accessToken ||
    !newRefreshToken ||
    !userId ||
    !ADMIN_ROLES.has(role)
  ) {
    const response = NextResponse.json(
      {
        message:
          "پاسخ تمدید نشست معتبر نیست.",
      },
      {
        status: 502,
      },
    );

    clearAdminCookies(response);

    return response;
  }

  const adminSession =
    await createAdminSession(
      userId,
      role,
    );

  const response = NextResponse.json({
    user,
  });

  const secure =
    process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: adminSession,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: accessToken,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/admin",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: newRefreshToken,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/admin",
    maxAge: extractRefreshMaxAge(
      backendSetCookie,
    ),
  });

  return response;
}