import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const ADMIN_PREFIX = "/admin";
const ALLY_PREFIX = "/aliado";
const PUBLIC_ROUTES = new Set(["/login", "/"]);

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAllyRoute = pathname.startsWith(ALLY_PREFIX);

  if (!isAdminRoute && !isAllyRoute && !PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("wears_session")?.value;
  const session = await decrypt(token);

  if ((isAdminRoute || isAllyRoute) && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAdminRoute && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/aliado", req.nextUrl));
  }

  if (isAllyRoute && session?.role !== "ALLY") {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(session.role === "ADMIN" ? "/admin" : "/aliado", req.nextUrl)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/aliado/:path*", "/login"],
};
