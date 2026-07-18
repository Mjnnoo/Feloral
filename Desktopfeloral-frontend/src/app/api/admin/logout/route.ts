import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/admin-session";

export const runtime = "nodejs";

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
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
  const refreshToken =
    request.cookies.get(
      ADMIN_REFRESH_COOKIE,
    )?.value;

  if (refreshToken) {
    try {
      await fetch(
        `${getApiBaseUrl()}/auth/logout`,
        {
          method: "POST",
          headers: {
            Cookie:
              `refresh_token=${encodeURIComponent(
                refreshToken,
              )}`,
          },
          cache: "no-store",
        },
      );
    } catch {
      // حتی اگر بک‌اند در دسترس نباشد،
      // خروج از فرانت‌اند انجام می‌شود.
    }
  }

  const response = NextResponse.json({
    message:
      "با موفقیت از پنل مدیریت خارج شدید.",
  });

  clearAdminCookies(response);

  return response;
}