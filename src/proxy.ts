import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const protectedPrefixes = ["/area", "/squadra", "/admin"];

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/accedi";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/area/:path*", "/squadra/:path*", "/admin/:path*"],
};
