import { createHmac, timingSafeEqual } from "node:crypto";
import { ADMIN_VIEW_TTL_SECONDS } from "./constants";

export type ViewCookiePayload = {
  sessionId: string;
  adminId: string;
  targetUserId: string;
  mode: "READ_ONLY";
  startedAt: string;
  exp: number;
};

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function sealViewCookie(payload: ViewCookiePayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function openViewCookie(
  token: string,
  secret: string,
  now = Date.now(),
): { payload: ViewCookiePayload; expired: boolean } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(body, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Partial<ViewCookiePayload>;
  if (row.mode !== "READ_ONLY") return null;
  if (!row.sessionId || !row.adminId || !row.targetUserId || !row.startedAt) return null;
  if (typeof row.exp !== "number" || !Number.isFinite(row.exp)) return null;
  return { payload: row as ViewCookiePayload, expired: row.exp * 1000 <= now };
}

export function viewCookieExpiry(startedAt: Date) {
  return new Date(startedAt.getTime() + ADMIN_VIEW_TTL_SECONDS * 1000);
}

export function viewCookieSecret() {
  return process.env.AUTH_SECRET ?? "dev-only-storage-secret";
}
