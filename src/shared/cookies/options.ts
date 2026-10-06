import { TEAM_COOKIE_MAX_AGE_SECONDS } from "@/shared/cookies/inventory";

export function shouldUseSecureCookie(proto: string | null | undefined) {
  if (proto === "https") return true;
  if (proto === "http") return false;
  return process.env.NODE_ENV === "production";
}

export function teamCookieOptions(secure: boolean) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge: TEAM_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    secure,
  };
}

export function clearTeamCookieOptions(secure: boolean) {
  return {
    ...teamCookieOptions(secure),
    maxAge: 0,
  };
}
