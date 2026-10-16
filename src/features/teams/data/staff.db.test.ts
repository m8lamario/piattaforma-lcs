import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { STAFF_SLOT_LIMIT } from "@/features/teams/domain/staff";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

describe.skipIf(!hasDatabase)("vincolo staff sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  it("impedisce il sesto staff e due insert concorrenti", async () => {
    const prisma = await client();
    const suffix = randomBytes(4).toString("hex");
    const competition = await prisma.competition.create({
      data: { name: "Staff Cup", slug: `staff-${suffix}` },
    });
    const edition = await prisma.edition.create({
      data: { competitionId: competition.id, name: "2026", year: 2026, staffFeeAmount: 5 },
    });
    const school = await prisma.school.create({ data: { name: `Liceo ${suffix}` } });
    const team = await prisma.team.create({
      data: {
        editionId: edition.id,
        schoolId: school.id,
        name: "Bianchi",
        inviteCode: `S-${suffix}`,
        registrationToken: `tok-s-${suffix}`,
      },
    });

    async function addStaff(index: number) {
      const user = await prisma.user.create({ data: { email: `staff-${suffix}-${index}@example.test` } });
      const profile = await prisma.playerProfile.create({
        data: { userId: user.id, firstName: "Staff", lastName: String(index) },
      });
      return prisma.registration.create({
        data: {
          playerProfileId: profile.id,
          teamId: team.id,
          editionId: edition.id,
          category: "STAFF",
          status: "ACCOUNT_CREATED",
        },
      });
    }

    for (let index = 0; index < STAFF_SLOT_LIMIT; index += 1) {
      await addStaff(index);
    }

    await expect(addStaff(STAFF_SLOT_LIMIT)).rejects.toThrow(/STAFF_LIMIT_REACHED/);

    const occupied = await prisma.registration.count({
      where: { teamId: team.id, category: "STAFF", status: { notIn: ["WITHDRAWN", "REMOVED"] } },
    });
    expect(occupied).toBe(STAFF_SLOT_LIMIT);

    await prisma.registration.deleteMany({ where: { teamId: team.id } });
    await prisma.playerProfile.deleteMany({ where: { user: { email: { startsWith: `staff-${suffix}-` } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `staff-${suffix}-` } } });

    for (let index = 0; index < STAFF_SLOT_LIMIT - 1; index += 1) {
      await addStaff(index);
    }

    const parallel = await Promise.allSettled([
      addStaff(90),
      addStaff(91),
    ]);
    const fulfilled = parallel.filter((result) => result.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    const afterRace = await prisma.registration.count({
      where: { teamId: team.id, category: "STAFF", status: { notIn: ["WITHDRAWN", "REMOVED"] } },
    });
    expect(afterRace).toBe(STAFF_SLOT_LIMIT);

    await prisma.registration.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.playerProfile.deleteMany({ where: { user: { email: { contains: suffix } } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffix } } });
    await prisma.school.delete({ where: { id: school.id } });
    await prisma.edition.delete({ where: { id: edition.id } });
    await prisma.competition.delete({ where: { id: competition.id } });
  });

  it("accetta solo uno staff della stessa squadra come allenatore e lo revoca se esce", async () => {
    const prisma = await client();
    const suffix = randomBytes(4).toString("hex");
    const competition = await prisma.competition.create({
      data: { name: "Coach Cup", slug: `coach-${suffix}` },
    });
    const edition = await prisma.edition.create({
      data: { competitionId: competition.id, name: "2026", year: 2026 },
    });
    const school = await prisma.school.create({ data: { name: `Istituto ${suffix}` } });
    const team = await prisma.team.create({
      data: {
        editionId: edition.id,
        schoolId: school.id,
        name: "Verdi",
        inviteCode: `C-${suffix}`,
        registrationToken: `tok-c-${suffix}`,
      },
    });
    const user = await prisma.user.create({ data: { email: `coach-${suffix}@example.test` } });
    const profile = await prisma.playerProfile.create({
      data: { userId: user.id, firstName: "Ada", lastName: "Coach" },
    });
    const player = await prisma.registration.create({
      data: {
        playerProfileId: profile.id,
        teamId: team.id,
        editionId: edition.id,
        category: "PLAYER",
        status: "APPROVED",
      },
    });

    await expect(
      prisma.team.update({ where: { id: team.id }, data: { coachRegistrationId: player.id } }),
    ).rejects.toThrow(/COACH_INVALID/);

    await prisma.registration.update({ where: { id: player.id }, data: { category: "STAFF" } });
    await prisma.team.update({ where: { id: team.id }, data: { coachRegistrationId: player.id } });
    await prisma.registration.update({ where: { id: player.id }, data: { status: "REMOVED" } });
    const cleared = await prisma.team.findUnique({ where: { id: team.id } });
    expect(cleared?.coachRegistrationId).toBeNull();

    await prisma.registration.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.playerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.school.delete({ where: { id: school.id } });
    await prisma.edition.delete({ where: { id: edition.id } });
    await prisma.competition.delete({ where: { id: competition.id } });
  });
});
