import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { consentCookieOptions } from "@/shared/cookies/consent";
import {
  ADOBE_FONTS_ORIGINS,
  CONSENT_COOKIE_NAME,
  RETIRED_COOKIE_NAMES,
  optionalTechnologies,
} from "@/shared/cookies/inventory";

const protectedPrefixes = ["/area", "/squadra", "/admin"];

function csp(nonce: string) {
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `'self' 'nonce-${nonce}'`;
  const fontSources = ADOBE_FONTS_ORIGINS.join(" ");
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    `style-src 'self' 'unsafe-inline' ${fontSources}`,
    `script-src ${scriptSrc}`,
    `font-src 'self' ${fontSources}`,
    "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function dropUnusedCookies(request: NextRequest, response: NextResponse) {
  const secure = request.nextUrl.protocol === "https:";
  const clear = consentCookieOptions({ secure, maxAge: 0 });
  if (optionalTechnologies().length === 0 && request.cookies.get(CONSENT_COOKIE_NAME)) {
    response.cookies.set(CONSENT_COOKIE_NAME, "", clear);
  }
  for (const name of RETIRED_COOKIE_NAMES) {
    if (request.cookies.get(name)) response.cookies.set(name, "", clear);
  }
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const session = await auth();
  const { pathname } = request.nextUrl;
  requestHeaders.set("x-pathname", pathname);
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/accedi";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("Content-Security-Policy", csp(nonce));
    dropUnusedCookies(request, redirectResponse);
    return redirectResponse;
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp(nonce));
  response.headers.set("x-nonce", nonce);
  dropUnusedCookies(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
