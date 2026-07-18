import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "./src/lib/admin-session";

function safeNextPath(
  value: string | null,
): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/admin";
}

export async function middleware(
  request: NextRequest,
) {
  const { pathname, searchParams } =
    request.nextUrl;

  const isAdminLogin =
    pathname === "/admin/login";

  const isAdminRoute =
    pathname.startsWith("/admin");

  const isEditorRoute =
    searchParams.get("editor") === "1" ||
    searchParams.get("admin") === "1";

  if (
    !isAdminRoute &&
    !isEditorRoute
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(
    ADMIN_SESSION_COOKIE,
  )?.value;

  const session =
    await verifyAdminSession(token);

  if (isAdminLogin) {
    if (!session) {
      return NextResponse.next();
    }

    const destination = safeNextPath(
      searchParams.get("next"),
    );

    return NextResponse.redirect(
      new URL(destination, request.url),
    );
  }

  if (!session) {
    const loginUrl = new URL(
      "/admin/login",
      request.url,
    );

    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};