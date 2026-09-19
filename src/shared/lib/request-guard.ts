import { headers } from "next/headers";
import { allowRequest } from "@/shared/lib/rate-limit";

const store = new Map<string, number[]>();

export const RATE_LIMITS = {
  login: { limit: 20, windowMs: 15 * 60 * 1000 },
  inviteCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  inviteRedeem: { limit: 10, windowMs: 60 * 60 * 1000 },
  profileWrite: { limit: 60, windowMs: 60 * 60 * 1000 },
  upload: { limit: 20, windowMs: 60 * 60 * 1000 },
  consentWrite: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const;

export async function clientKey(prefix: string) {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  return allowRequest(store, key, limit, windowMs);
}

export async function userAgentAndIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  };
}
