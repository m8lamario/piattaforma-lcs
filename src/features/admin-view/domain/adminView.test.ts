import { describe, expect, it } from "vitest";
import { authorize } from "@/shared/authz/authorize";
import type { Actor } from "@/shared/authz/types";
import { openViewCookie, sealViewCookie } from "./cookie";
import {
  canReadMedicalFile,
  decideAdminViewStart,
  personLabel,
  sessionDurationSeconds,
} from "./policy";
import { isBlockedWrite } from "./writes";

const secret = "test-secret";

const superAdmin: Actor = {
  userId: "root",
  roles: [{ role: "SUPER_ADMIN" }],
  membershipTeamIds: [],
};

const orgAdmin: Actor = {
  userId: "org",
  roles: [{ role: "ORGANIZATION_ADMIN" }],
  membershipTeamIds: [],
};

const player: Actor = {
  userId: "player",
  roles: [{ role: "PLAYER" }],
  membershipTeamIds: ["team-1"],
};

describe("decideAdminViewStart", () => {
  it("consente al super admin un account attivo diverso dal proprio", () => {
    expect(
      decideAdminViewStart({
        viewerCan: authorize(superAdmin, "user:view_as").allow,
        sameUser: false,
        targetActive: true,
        confirmed: true,
      }).ok,
    ).toBe(true);
  });

  it("nega giocatore, org admin e revisore", () => {
    const reviewer: Actor = {
      userId: "reviewer",
      roles: [{ role: "MEDICAL_REVIEWER" }],
      membershipTeamIds: [],
    };
    for (const actor of [player, orgAdmin, reviewer]) {
      expect(authorize(actor, "user:view_as").allow).toBe(false);
      expect(
        decideAdminViewStart({
          viewerCan: false,
          sameUser: false,
          targetActive: true,
          confirmed: true,
        }),
      ).toEqual({ ok: false, reason: "forbidden" });
    }
  });

  it("nega se stesso, un account non attivo e la conferma mancante", () => {
    expect(
      decideAdminViewStart({
        viewerCan: true,
        sameUser: true,
        targetActive: true,
        confirmed: true,
      }),
    ).toEqual({ ok: false, reason: "self" });
    expect(
      decideAdminViewStart({
        viewerCan: true,
        sameUser: false,
        targetActive: false,
        confirmed: true,
      }),
    ).toEqual({ ok: false, reason: "unavailable" });
    expect(
      decideAdminViewStart({
        viewerCan: true,
        sameUser: false,
        targetActive: true,
        confirmed: false,
      }),
    ).toEqual({ ok: false, reason: "confirm" });
  });
});

describe("cookie di visualizzazione", () => {
  const payload = {
    sessionId: "sess",
    adminId: "admin",
    targetUserId: "target",
    mode: "READ_ONLY" as const,
    startedAt: "2026-11-06T18:00:00.000Z",
    exp: 2_000_000_000,
  };

  it("rifiuta un payload manomesso e non contiene password", () => {
    const token = sealViewCookie(payload, secret);
    expect(token).not.toContain("password");
    expect(openViewCookie(token, secret, 1_000)?.payload).toMatchObject({
      sessionId: "sess",
      adminId: "admin",
      targetUserId: "target",
      mode: "READ_ONLY",
    });
    const [body, signature] = token.split(".");
    expect(openViewCookie(`${body}.${signature}x`, secret)).toBeNull();
    expect(openViewCookie(token, "altro-segreto")).toBeNull();
  });

  it("segna come scaduto un cookie oltre exp senza accettarne il modo", () => {
    const token = sealViewCookie(payload, secret);
    expect(openViewCookie(token, secret, payload.exp * 1000 + 1)?.expired).toBe(true);
  });
});

describe("blocco scritture", () => {
  it("blocca le mutazioni e le query raw, non le letture né audit e rate limit", () => {
    expect(isBlockedWrite({ viewActive: true, model: "User", operation: "update" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "Document", operation: "delete" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "Payment", operation: "create" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "ConsentRecord", operation: "create" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "$raw", operation: "executeRaw" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "$raw", operation: "queryRaw" })).toBe(true);
    expect(isBlockedWrite({ viewActive: true, model: "User", operation: "findMany" })).toBe(false);
    expect(isBlockedWrite({ viewActive: true, model: "AuditLog", operation: "create" })).toBe(false);
    expect(isBlockedWrite({ viewActive: true, model: "RateLimitHit", operation: "create" })).toBe(false);
    expect(isBlockedWrite({ viewActive: true, model: "AuditLog", operation: "delete" })).toBe(true);
    expect(isBlockedWrite({ viewActive: false, model: "User", operation: "update" })).toBe(false);
  });
});

describe("file sanitario durante la visualizzazione", () => {
  it("usa il permesso dell’amministratore, non quello del soggetto", () => {
    expect(
      canReadMedicalFile({ viewing: true, viewerAllowed: false, subjectAllowed: true }),
    ).toBe(false);
    expect(
      canReadMedicalFile({ viewing: true, viewerAllowed: true, subjectAllowed: false }),
    ).toBe(true);
    expect(
      canReadMedicalFile({ viewing: false, viewerAllowed: false, subjectAllowed: true }),
    ).toBe(true);
    expect(authorize(orgAdmin, "document:read_file", { ownerUserId: "player" }).allow).toBe(false);
    expect(authorize(superAdmin, "document:read_file", { ownerUserId: "player" }).allow).toBe(true);
    expect(authorize(player, "document:read_file", { ownerUserId: "player" }).allow).toBe(true);
  });
});

describe("etichetta e durata", () => {
  it("preferisce nome e cognome del profilo e calcola la durata", () => {
    expect(
      personLabel({
        email: "a@b.c",
        name: "Account",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    ).toBe("Ada Lovelace");
    const started = new Date("2026-11-06T18:00:00.000Z");
    expect(sessionDurationSeconds(started, new Date("2026-11-06T18:12:05.000Z"))).toBe(725);
    expect(sessionDurationSeconds(started, null, new Date("2026-11-06T18:01:00.000Z"))).toBe(60);
  });
});
