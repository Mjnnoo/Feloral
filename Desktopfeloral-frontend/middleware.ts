import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "feloral_admin";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isEditorRoute = searchParams.get("editor") === "1" || searchParams.get("admin") === "1";
  const isLoggedIn = request.cookies.get(ADMIN_COOKIE_NAME)?.value === "1";

  if ((isAdminRoute && !isAdminLogin) || isEditorRoute) {
    if (!isLoggedIn) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAdminLogin && isLoggedIn) {
    const next = searchParams.get("next") || "/admin";
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = next.startsWith("/") ? next : "/admin";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
