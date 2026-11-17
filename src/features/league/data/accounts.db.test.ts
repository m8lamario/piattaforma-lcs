import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

describe.skipIf(!hasDatabase)("account supervisore di lega sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  it("rifiuta un'email già usata e in sospensione cancella le sessioni", async () => {
    const prisma = await client();
    const {
      createLeagueSupervisor,
      setLeagueSupervisorStatus,
    } = await import("./accounts");
    const suffix = randomBytes(4).toString("hex");
    const cup = await prisma.competition.create({ data: { name: `Lega Acc ${suffix}`, slug: `lega-acc-${suffix}` } });
    const edition = await prisma.edition.create({
      data: { competitionId: cup.id, name: "2026", year: 2026 },
    });
    const admin = await prisma.user.create({ data: { email: `admin-${suffix}@lega.test` } });
    const taken = await prisma.user.create({ data: { email: `taken-${suffix}@lega.test` } });
    let createdUserId: string | null = null;

    try {
      const rejected = await createLeagueSupervisor({
        editionId: edition.id,
        email: taken.email,
        firstName: "Già",
        lastName: "Usata",
        origin: "http://localhost:3000",
        createdByUserId: admin.id,
      });
      expect(rejected).toMatchObject({ ok: false, code: "LEAGUE_EMAIL_TAKEN" });

      const created = await createLeagueSupervisor({
        editionId: edition.id,
        email: `nuovo-${suffix}@lega.test`,
        firstName: "Novo",
        lastName: "Supervisore",
        origin: "http://localhost:3000",
        createdByUserId: admin.id,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      createdUserId = created.userId;

      await prisma.leagueSupervisor.update({
        where: { id: created.account.id },
        data: { activatedAt: new Date() },
      });
      await prisma.session.create({
        data: {
          sessionToken: `sess-${suffix}`,
          userId: created.userId,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const suspended = await setLeagueSupervisorStatus({ id: created.account.id, status: "SUSPENDED" });
      expect(suspended.ok).toBe(true);
      const sessions = await prisma.session.count({ where: { userId: created.userId } });
      expect(sessions).toBe(0);
      const row = await prisma.leagueSupervisor.findUnique({ where: { id: created.account.id } });
      expect(row?.status).toBe("SUSPENDED");
      expect(row?.activationTokenHash).toBeNull();
    } finally {
      if (createdUserId) {
        await prisma.session.deleteMany({ where: { userId: createdUserId } });
        await prisma.leagueSupervisor.deleteMany({ where: { userId: createdUserId } });
        await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, taken.id] } } });
      await prisma.edition.delete({ where: { id: edition.id } });
      await prisma.competition.delete({ where: { id: cup.id } });
    }
  });
});
