import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(
    ADMIN_SESSION_COOKIE,
  )?.value;

  const session = await verifyAdminSession(sessionToken);

  if (!session) {
    const response = NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      {
        status: 401,
      },
    );

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      role: session.role,
    },
  });
}