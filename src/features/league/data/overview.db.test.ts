import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

function leaksForbidden(value: unknown) {
  const encoded = JSON.stringify(value);
  return ["storageKey", "reason", "anomalies", "receiptUrl", "fiscalCode"].filter((key) => encoded.includes(key));
}

describe.skipIf(!hasDatabase)("lettura supervisore di lega sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  it("mostra solo i giocatori PLAYER dell'edizione assegnata, anche se la scuola è in due edizioni", async () => {
    const prisma = await client();
    const { getLeaguePlayer, getLeagueSchool, listLeagueWorkspace } = await import("./overview");
    const suffix = randomBytes(4).toString("hex");

    const cupA = await prisma.competition.create({ data: { name: `Lega A ${suffix}`, slug: `lega-a-${suffix}` } });
    const cupB = await prisma.competition.create({ data: { name: `Lega B ${suffix}`, slug: `lega-b-${suffix}` } });
    const editionA = await prisma.edition.create({
      data: { competitionId: cupA.id, name: "2026", year: 2026 },
    });
    const editionB = await prisma.edition.create({
      data: { competitionId: cupB.id, name: "2026", year: 2026 },
    });
    const school = await prisma.school.create({ data: { name: `Istituto ${suffix}` } });
    const otherSchool = await prisma.school.create({ data: { name: `Altro ${suffix}` } });
    const teamA = await prisma.team.create({
      data: {
        editionId: editionA.id,
        schoolId: school.id,
        name: "Alfa",
        inviteCode: `LA-${suffix}`,
        registrationToken: `tok-la-${suffix}`,
      },
    });
    const teamB = await prisma.team.create({
      data: {
        editionId: editionB.id,
        schoolId: school.id,
        name: "Beta",
        inviteCode: `LB-${suffix}`,
        registrationToken: `tok-lb-${suffix}`,
      },
    });
    const teamOther = await prisma.team.create({
      data: {
        editionId: editionB.id,
        schoolId: otherSchool.id,
        name: "Gamma",
        inviteCode: `LG-${suffix}`,
        registrationToken: `tok-lg-${suffix}`,
      },
    });

    async function person(input: {
      email: string;
      teamId: string;
      editionId: string;
      lastName: string;
      category?: "PLAYER" | "STAFF";
    }) {
      const user = await prisma.user.create({ data: { email: input.email } });
      const profile = await prisma.playerProfile.create({
        data: {
          userId: user.id,
          firstName: "Luca",
          lastName: input.lastName,
          fiscalCode: `${input.lastName.slice(0, 6)}${suffix}`.toUpperCase(),
        },
      });
      const registration = await prisma.registration.create({
        data: {
          playerProfileId: profile.id,
          teamId: input.teamId,
          editionId: input.editionId,
          category: input.category ?? "PLAYER",
          status: "APPROVED",
        },
      });
      return { user, profile, registration };
    }

    const inScope = await person({
      email: `in-${suffix}@lega.test`,
      teamId: teamA.id,
      editionId: editionA.id,
      lastName: `Insc${suffix}`,
    });
    const outOfScope = await person({
      email: `out-${suffix}@lega.test`,
      teamId: teamB.id,
      editionId: editionB.id,
      lastName: `Outs${suffix}`,
    });
    const staff = await person({
      email: `staff-${suffix}@lega.test`,
      teamId: teamA.id,
      editionId: editionA.id,
      lastName: `Staf${suffix}`,
      category: "STAFF",
    });
    const actor = await prisma.user.create({ data: { email: `sup-${suffix}@lega.test` } });

    try {
      const workspace = await listLeagueWorkspace(editionA.id);
      expect(workspace.players.map((row) => row.registrationId)).toEqual([inScope.registration.id]);
      expect(workspace.players.map((row) => row.registrationId)).not.toContain(outOfScope.registration.id);
      expect(workspace.players.map((row) => row.registrationId)).not.toContain(staff.registration.id);
      expect(leaksForbidden(workspace.players)).toEqual([]);

      const schoolPage = await getLeagueSchool(editionA.id, school.id, actor.id);
      expect(schoolPage?.players.map((row) => row.registrationId)).toEqual([inScope.registration.id]);
      expect(leaksForbidden(schoolPage?.players)).toEqual([]);

      const otherEditionSchool = await getLeagueSchool(editionA.id, otherSchool.id, actor.id);
      expect(otherEditionSchool).toBeNull();
      const deniedSchool = await prisma.auditLog.findFirst({
        where: { action: "LEAGUE_ACCESS_DENIED", entityType: "School", entityId: otherSchool.id },
      });
      expect(deniedSchool?.metadata).toMatchObject({ editionId: editionA.id });

      const otherPlayer = await getLeaguePlayer(editionA.id, outOfScope.registration.id, actor.id);
      expect(otherPlayer).toBeNull();
      const deniedPlayer = await prisma.auditLog.findFirst({
        where: { action: "LEAGUE_ACCESS_DENIED", entityType: "Registration", entityId: outOfScope.registration.id },
      });
      expect(deniedPlayer?.metadata).toMatchObject({ editionId: editionA.id });
    } finally {
      await prisma.auditLog.deleteMany({ where: { actorUserId: actor.id } });
      await prisma.registration.deleteMany({
        where: { teamId: { in: [teamA.id, teamB.id, teamOther.id] } },
      });
      await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id, teamOther.id] } } });
      await prisma.playerProfile.deleteMany({ where: { user: { email: { contains: suffix } } } });
      await prisma.user.deleteMany({ where: { email: { contains: suffix } } });
      await prisma.school.deleteMany({ where: { id: { in: [school.id, otherSchool.id] } } });
      await prisma.edition.deleteMany({ where: { id: { in: [editionA.id, editionB.id] } } });
      await prisma.competition.deleteMany({ where: { id: { in: [cupA.id, cupB.id] } } });
    }
  });
});
