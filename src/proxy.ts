import { NextRequest, NextResponse } from "next/server";
import { decrypt, type SessionPayload } from "@/lib/session";

const ADMIN_PREFIX = "/admin";
const ALLY_PREFIX = "/aliado";
const CASHIER_PREFIX = "/cajero";
const PUBLIC_ROUTES = new Set(["/login", "/"]);

function homeFor(role: SessionPayload["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "CASHIER") return "/cajero";
  return "/aliado";
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAllyRoute = pathname.startsWith(ALLY_PREFIX);
  const isCashierRoute = pathname.startsWith(CASHIER_PREFIX);

  if (!isAdminRoute && !isAllyRoute && !isCashierRoute && !PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("wears_session")?.value;
  const session = await decrypt(token);

  if ((isAdminRoute || isAllyRoute || isCashierRoute) && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAdminRoute && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeFor(session!.role), req.nextUrl));
  }

  if (isAllyRoute && session?.role !== "ALLY") {
    return NextResponse.redirect(new URL(homeFor(session!.role), req.nextUrl));
  }

  if (isCashierRoute && session?.role !== "CASHIER") {
    return NextResponse.redirect(new URL(homeFor(session!.role), req.nextUrl));
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/aliado/:path*", "/cajero/:path*", "/login"],
};
