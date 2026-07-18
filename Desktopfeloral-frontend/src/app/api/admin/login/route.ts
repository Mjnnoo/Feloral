import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_ROLES,
  ADMIN_SESSION_COOKIE,
  createAdminSession,
} from "@/lib/admin-session";

export const runtime = "nodejs";

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload
  ) {
    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join("، ");
    }
  }

  return fallback;
}

export async function POST(
  request: NextRequest,
) {
  let credentials: {
    mobile?: unknown;
    password?: unknown;
  };

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "اطلاعات ورود معتبر نیست.",
      },
      {
        status: 400,
      },
    );
  }

  const mobile =
    typeof credentials.mobile === "string"
      ? credentials.mobile.trim()
      : "";

  const password =
    typeof credentials.password === "string"
      ? credentials.password
      : "";

  if (!mobile || !password) {
    return NextResponse.json(
      {
        message:
          "شماره موبایل و رمز عبور الزامی است.",
      },
      {
        status: 400,
      },
    );
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(
      `${getApiBaseUrl()}/auth/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          mobile,
          password,
        }),
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
    return NextResponse.json(
      {
        message: getErrorMessage(
          payload,
          "ورود به پنل مدیریت ناموفق بود.",
        ),
      },
      {
        status: backendResponse.status,
      },
    );
  }

  const accessToken =
    payload &&
    typeof payload === "object" &&
    typeof payload.access_token === "string"
      ? payload.access_token
      : "";

  const user =
    payload &&
    typeof payload === "object" &&
    payload.user &&
    typeof payload.user === "object"
      ? payload.user
      : null;

  const userId =
    user && typeof user.id === "number"
      ? user.id
      : 0;

  const role =
    user && typeof user.role === "string"
      ? user.role.trim().toLowerCase()
      : "";

  if (
    !accessToken ||
    !userId ||
    !ADMIN_ROLES.has(role)
  ) {
    return NextResponse.json(
      {
        message:
          "پاسخ احراز هویت مدیریت معتبر نیست.",
      },
      {
        status: 403,
      },
    );
  }

  const adminSession = await createAdminSession(
    userId,
    role,
  );

  const response = NextResponse.json({
    access_token: accessToken,
    user,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: adminSession,
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  // Refresh Token صادرشده توسط بک‌اند را
  // بدون در دسترس قرار دادن در JavaScript منتقل می‌کنیم.
  const backendSetCookie =
    backendResponse.headers.get("set-cookie");

  if (backendSetCookie) {
    response.headers.append(
      "set-cookie",
      backendSetCookie,
    );
  }

  return response;
}