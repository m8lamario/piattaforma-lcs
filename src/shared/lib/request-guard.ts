import { headers } from "next/headers";
import { allowRequest } from "@/shared/lib/rate-limit";
import { prisma } from "@/shared/lib/prisma";

export const RATE_LIMITS = {
  login: { limit: 20, windowMs: 15 * 60 * 1000 },
  inviteCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  inviteRedeem: { limit: 10, windowMs: 60 * 60 * 1000 },
  profileWrite: { limit: 60, windowMs: 60 * 60 * 1000 },
  upload: { limit: 20, windowMs: 60 * 60 * 1000 },
  consentWrite: { limit: 40, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 15 * 60 * 1000 },
  bulkInvite: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export async function clientKey(prefix: string) {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  try {
    return await prisma.$transaction(async (tx) => {
      const count = await tx.rateLimitHit.count({
        where: { key, createdAt: { gt: since } },
      });
      if (count >= limit) return false;
      await tx.rateLimitHit.create({ data: { key } });
      return true;
    });
  } catch {
    return allowRequest(fallbackStore, key, limit, windowMs);
  }
}

const fallbackStore = new Map<string, number[]>();

export async function userAgentAndIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  };
}
