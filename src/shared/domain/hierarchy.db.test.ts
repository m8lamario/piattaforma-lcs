import "dotenv/config";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@generated/client";
import { afterAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type Fixture = {
  editionA: string;
  editionB: string;
  teamA: string;
  teamA2: string;
  registrationId: string;
};

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

describe.skipIf(!hasDatabase)("vincoli di gerarchia sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  async function inTransaction(run: (tx: Prisma.TransactionClient, ids: Fixture) => Promise<void>) {
    const prisma = await client();
    const suffix = randomBytes(4).toString("hex");
    let constraintFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const competition = await tx.competition.create({
          data: { name: "Scope Cup", slug: `scope-${suffix}` },
        });
        const editionA = await tx.edition.create({
          data: { competitionId: competition.id, name: "2026", year: 2026 },
        });
        const editionB = await tx.edition.create({
          data: { competitionId: competition.id, name: "2027", year: 2027 },
        });
        const school = await tx.school.create({ data: { name: `ITIS ${suffix}` } });
        const teamA = await tx.team.create({
          data: {
            editionId: editionA.id,
            schoolId: school.id,
            name: "Castelli 2026",
            inviteCode: `A-${suffix}`,
            registrationToken: `tok-a-${suffix}`,
          },
        });
        const teamA2 = await tx.team.create({
          data: {
            editionId: editionA.id,
            schoolId: school.id,
            name: "Liceo 2026",
            inviteCode: `A2-${suffix}`,
            registrationToken: `tok-a2-${suffix}`,
          },
        });
        const user = await tx.user.create({ data: { email: `scope-${suffix}@example.test` } });
        const profile = await tx.playerProfile.create({
          data: { userId: user.id, firstName: "Mario", lastName: "Rossi" },
        });
        const registration = await tx.registration.create({
          data: {
            playerProfileId: profile.id,
            teamId: teamA.id,
            editionId: editionA.id,
            status: "ACCOUNT_CREATED",
          },
        });
        try {
          await run(tx, {
            editionA: editionA.id,
            editionB: editionB.id,
            teamA: teamA.id,
            teamA2: teamA2.id,
            registrationId: registration.id,
          });
        } catch (error) {
          constraintFailed = true;
          throw error;
        }
        throw new Error("rollback");
      });
    } catch (error) {
      if (error instanceof Error && error.message === "rollback") return { constraintFailed: false };
      if (constraintFailed) return { constraintFailed: true };
      throw error;
    }
    return { constraintFailed: false };
  }

  it("accetta squadra, registrazione e pagamenti della stessa edizione", async () => {
    const result = await inTransaction(async (tx, ids) => {
      await tx.payment.create({
        data: {
          registrationId: ids.registrationId,
          editionId: ids.editionA,
          amount: 40,
          provider: "stub",
        },
      });
      await tx.payment.create({
        data: { teamId: ids.teamA, editionId: ids.editionA, amount: 200, provider: "stub" },
      });
    });
    expect(result.constraintFailed).toBe(false);
  });

  it("rifiuta una registrazione la cui squadra appartiene a un'altra edizione", async () => {
    const result = await inTransaction(async (tx, ids) => {
      const user = await tx.user.create({
        data: { email: `other-${ids.teamA}@example.test` },
      });
      const profile = await tx.playerProfile.create({
        data: { userId: user.id, firstName: "Anna", lastName: "Bianchi" },
      });
      await tx.registration.create({
        data: {
          playerProfileId: profile.id,
          teamId: ids.teamA,
          editionId: ids.editionB,
          status: "ACCOUNT_CREATED",
        },
      });
    });
    expect(result.constraintFailed).toBe(true);
  });

  it("rifiuta un pagamento squadra su un'edizione diversa", async () => {
    const result = await inTransaction(async (tx, ids) => {
      await tx.payment.create({
        data: { teamId: ids.teamA, editionId: ids.editionB, amount: 200, provider: "stub" },
      });
    });
    expect(result.constraintFailed).toBe(true);
  });

  it("rifiuta un pagamento legato a una registrazione di un'altra edizione", async () => {
    const result = await inTransaction(async (tx, ids) => {
      await tx.payment.create({
        data: {
          registrationId: ids.registrationId,
          editionId: ids.editionB,
          amount: 40,
          provider: "stub",
        },
      });
    });
    expect(result.constraintFailed).toBe(true);
  });

  it("rifiuta registrazione e squadra diverse nello stesso pagamento", async () => {
    const result = await inTransaction(async (tx, ids) => {
      await tx.payment.create({
        data: {
          registrationId: ids.registrationId,
          teamId: ids.teamA2,
          editionId: ids.editionA,
          amount: 40,
          provider: "stub",
        },
      });
    });
    expect(result.constraintFailed).toBe(true);
  });
});
