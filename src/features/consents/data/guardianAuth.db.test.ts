import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createInviteToken, hashInviteToken } from "@/features/teams/domain/token";
import { enrollmentBoxCodes, enrollmentRequiredCodes } from "@/features/consents/domain/guardianAuth";
import type { ConsentBoxCode } from "@/features/consents/domain/boxes";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

function enrollmentBoxes(overrides: Partial<Record<ConsentBoxCode, boolean>> = {}) {
  const required = new Set(enrollmentRequiredCodes());
  return enrollmentBoxCodes(false).map((code) => ({
    code,
    accepted: overrides[code] ?? required.has(code),
  }));
}

describe.skipIf(!hasDatabase)("autorizzazione genitore sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  async function withFixture(
    run: (ctx: {
      token: string;
      tokenId: string;
      authorizationId: string;
      registrationId: string;
      playerUserId: string;
      guardianId: string;
      adminUserId: string;
    }) => Promise<void>,
    options?: { usedAt?: Date | null; expiresAt?: Date; status?: "PENDING" | "OPENED" | "REFUSED" | "AUTHORIZED" },
  ) {
    const prisma = await client();
    const suffix = randomBytes(4).toString("hex");
    const competition = await prisma.competition.create({
      data: { name: `Guardian Cup ${suffix}`, slug: `guardian-${suffix}` },
    });
    const edition = await prisma.edition.create({
      data: { competitionId: competition.id, name: "2026", year: 2026, isActive: true },
    });
    const school = await prisma.school.create({ data: { name: `Liceo ${suffix}` } });
    const team = await prisma.team.create({
      data: {
        editionId: edition.id,
        schoolId: school.id,
        name: "Bianchi",
        inviteCode: `G-${suffix}`,
        registrationToken: `tok-g-${suffix}`,
      },
    });
    const player = await prisma.user.create({ data: { email: `player-${suffix}@example.test` } });
    const admin = await prisma.user.create({ data: { email: `admin-${suffix}@example.test` } });
    await prisma.userRole.create({ data: { userId: admin.id, role: "SUPER_ADMIN" } });
    const profile = await prisma.playerProfile.create({
      data: {
        userId: player.id,
        firstName: "Luca",
        lastName: "Bianchi",
        birthDate: new Date("2012-05-01T00:00:00.000Z"),
      },
    });
    const guardian = await prisma.guardian.create({
      data: {
        playerProfileId: profile.id,
        firstName: "Anna",
        lastName: "Bianchi",
        relationship: "madre",
        email: `anna-${suffix}@example.test`,
        kind: "PRIMARY",
      },
    });
    const registration = await prisma.registration.create({
      data: {
        playerProfileId: profile.id,
        teamId: team.id,
        editionId: edition.id,
        category: "PLAYER",
        status: "IN_PROGRESS",
      },
    });
    const authorization = await prisma.guardianAuthorization.create({
      data: {
        guardianId: guardian.id,
        playerProfileId: profile.id,
        registrationId: registration.id,
        authorizationType: "ENROLLMENT",
        status: options?.status ?? "OPENED",
        openedAt: new Date(),
      },
    });
    const token = createInviteToken();
    const tokenRow = await prisma.guardianLinkToken.create({
      data: {
        tokenHash: hashInviteToken(token),
        purpose: "AUTHORIZE",
        guardianId: guardian.id,
        playerProfileId: profile.id,
        registrationId: registration.id,
        authorizationId: authorization.id,
        expiresAt: options?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usedAt: options?.usedAt === undefined ? null : options.usedAt,
      },
    });
    await prisma.guardianAuthorization.update({
      where: { id: authorization.id },
      data: { tokenId: tokenRow.id },
    });

    try {
      await run({
        token,
        tokenId: tokenRow.id,
        authorizationId: authorization.id,
        registrationId: registration.id,
        playerUserId: player.id,
        guardianId: guardian.id,
        adminUserId: admin.id,
      });
    } finally {
      await prisma.emailEvent.deleteMany({
        where: { emailMessage: { sourceEntityId: { in: [authorization.id, registration.id] } } },
      });
      await prisma.emailMessage.deleteMany({
        where: {
          OR: [
            { userId: { in: [player.id, admin.id] } },
            { sourceEntityId: { in: [authorization.id, registration.id] } },
            { toAddress: { contains: suffix } },
          ],
        },
      });
      await prisma.notification.deleteMany({ where: { userId: { in: [player.id, admin.id] } } });
      await prisma.auditLog.deleteMany({
        where: { OR: [{ authorizationId: authorization.id }, { actorUserId: { in: [player.id, admin.id] } }] },
      });
      await prisma.consentChoice.deleteMany({ where: { registrationId: registration.id } });
      await prisma.consentRecord.deleteMany({ where: { registrationId: registration.id } });
      await prisma.guardianAuthorizationDecision.deleteMany({ where: { authorizationId: authorization.id } });
      await prisma.guardianAuthorization.update({
        where: { id: authorization.id },
        data: { tokenId: null },
      });
      await prisma.guardianLinkToken.deleteMany({ where: { registrationId: registration.id } });
      await prisma.guardianAuthorization.deleteMany({ where: { registrationId: registration.id } });
      await prisma.registration.delete({ where: { id: registration.id } });
      await prisma.guardian.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.playerProfile.delete({ where: { id: profile.id } });
      await prisma.userRole.deleteMany({ where: { userId: admin.id } });
      await prisma.user.deleteMany({ where: { id: { in: [player.id, admin.id] } } });
      await prisma.team.delete({ where: { id: team.id } });
      await prisma.school.delete({ where: { id: school.id } });
      await prisma.edition.delete({ where: { id: edition.id } });
      await prisma.competition.delete({ where: { id: competition.id } });
    }
  }

  it("rifiuto, poi modifica, poi accettazione: stesso record e storico precedente", async () => {
    const prisma = await client();
    const { submitGuardianAuthorization } = await import("./guardianAuth");
    await withFixture(async (ctx) => {
      const refused = await submitGuardianAuthorization({
        token: ctx.token,
        purpose: "AUTHORIZE",
        refuse: true,
        refuseConfirm: true,
        g3: "SOLE",
        boxes: enrollmentBoxes(),
        versionIds: {},
      });
      expect(refused.ok).toBe(true);
      if (!refused.ok) return;

      const afterRefuse = await prisma.guardianAuthorization.findUnique({
        where: { id: ctx.authorizationId },
        include: { decisions: true, currentToken: true },
      });
      expect(afterRefuse?.status).toBe("REFUSED");
      expect(afterRefuse?.currentToken?.usedAt).toBeNull();
      expect(afterRefuse?.decisions.length).toBeGreaterThan(0);
      const refusedCount = afterRefuse?.decisions.length ?? 0;

      const accepted = await submitGuardianAuthorization({
        token: ctx.token,
        purpose: "AUTHORIZE",
        refuse: false,
        g3: "SOLE",
        boxes: enrollmentBoxes(),
        versionIds: {},
      });
      expect(accepted.ok).toBe(true);
      if (!accepted.ok) return;
      expect(accepted.refused).toBe(false);

      const afterAccept = await prisma.guardianAuthorization.findUnique({
        where: { id: ctx.authorizationId },
        include: { decisions: { orderBy: { createdAt: "asc" } } },
      });
      expect(afterAccept?.status).toBe("AUTHORIZED");
      expect(afterAccept?.decisions.length).toBeGreaterThan(refusedCount);
      expect(afterAccept?.decisions.some((row) => row.accepted === false && row.previousAccepted == null)).toBe(true);
      expect(afterAccept?.decisions.some((row) => row.accepted === true && row.previousAccepted === false)).toBe(true);

      const audits = await prisma.auditLog.findMany({
        where: { authorizationId: ctx.authorizationId },
        orderBy: { createdAt: "asc" },
      });
      expect(audits.some((row) => row.action === "GUARDIAN_REFUSE")).toBe(true);
      expect(audits.some((row) => row.action === "GUARDIAN_AMEND")).toBe(true);
    });
  });

  it("accettazione poi revoca di una liberatoria: resta AUTHORIZED e conserva lo storico", async () => {
    const prisma = await client();
    const { submitGuardianAuthorization } = await import("./guardianAuth");
    await withFixture(async (ctx) => {
      const first = await submitGuardianAuthorization({
        token: ctx.token,
        purpose: "AUTHORIZE",
        refuse: false,
        g3: "SOLE",
        boxes: enrollmentBoxes({ G9: true }),
        versionIds: {},
      });
      expect(first.ok).toBe(true);

      const amended = await submitGuardianAuthorization({
        token: ctx.token,
        purpose: "AUTHORIZE",
        refuse: false,
        g3: "SOLE",
        boxes: enrollmentBoxes({ G9: false }),
        versionIds: {},
      });
      expect(amended.ok).toBe(true);

      const row = await prisma.guardianAuthorization.findUnique({
        where: { id: ctx.authorizationId },
        include: { decisions: { orderBy: { createdAt: "asc" } } },
      });
      expect(row?.status).toBe("AUTHORIZED");
      const g9 = row?.decisions.filter((decision) => decision.code === "G9") ?? [];
      expect(g9.length).toBeGreaterThanOrEqual(2);
      expect(g9[0]?.accepted).toBe(true);
      expect(g9.at(-1)?.accepted).toBe(false);
      expect(g9.at(-1)?.previousAccepted).toBe(true);

      const choices = await prisma.consentChoice.findMany({
        where: { registrationId: ctx.registrationId, code: "G9" },
        orderBy: { createdAt: "asc" },
      });
      expect(choices.some((choice) => choice.accepted)).toBe(true);
      expect(choices.at(-1)?.accepted).toBe(false);

      const notices = await prisma.notification.findMany({
        where: { type: "MEDIA_REVOKE_INTERNAL" },
      });
      expect(notices.length).toBeGreaterThan(0);
    });
  });

  it("rifiuta l’invio se il token è scaduto", async () => {
    const { submitGuardianAuthorization } = await import("./guardianAuth");
    await withFixture(
      async (ctx) => {
        const result = await submitGuardianAuthorization({
          token: ctx.token,
          purpose: "AUTHORIZE",
          refuse: false,
          g3: "SOLE",
          boxes: enrollmentBoxes(),
          versionIds: {},
        });
        expect(result).toEqual({ ok: false, reason: "invalid" });
      },
      { expiresAt: new Date("2020-01-01T00:00:00Z"), status: "OPENED" },
    );
  });

  it("reimposta una REFUSED già consumata sulla stessa riga e tiene le decisioni", async () => {
    const prisma = await client();
    const { resetEnrollmentAuthorization } = await import("./guardianAuth");
    await withFixture(
      async (ctx) => {
        await prisma.guardianAuthorizationDecision.create({
          data: {
            authorizationId: ctx.authorizationId,
            code: "G1",
            accepted: false,
            clauseText: "G1",
          },
        });
        const reset = await resetEnrollmentAuthorization({
          registrationId: ctx.registrationId,
          actorUserId: ctx.adminUserId,
        });
        expect(reset.ok).toBe(true);
        if (!reset.ok) return;
        expect(reset.authorizationId).toBe(ctx.authorizationId);

        const row = await prisma.guardianAuthorization.findUnique({
          where: { id: ctx.authorizationId },
          include: { decisions: true, currentToken: true },
        });
        expect(row?.status).toBe("PENDING");
        expect(row?.currentToken?.id).not.toBe(ctx.tokenId);
        expect(row?.currentToken?.usedAt).toBeNull();
        expect(row?.decisions).toHaveLength(1);

        const oldToken = await prisma.guardianLinkToken.findUnique({ where: { id: ctx.tokenId } });
        expect(oldToken?.usedAt).not.toBeNull();

        const audit = await prisma.auditLog.findFirst({
          where: { authorizationId: ctx.authorizationId, action: "GUARDIAN_RESET" },
        });
        expect(audit).toBeTruthy();
      },
      { status: "REFUSED", usedAt: new Date() },
    );
  });
});
