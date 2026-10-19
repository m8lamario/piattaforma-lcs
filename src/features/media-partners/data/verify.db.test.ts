import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { dtoLeaksForbiddenFields } from "@/features/media-partners/domain/verify";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

describe.skipIf(!hasDatabase)("ricerca media partner sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  it("filtra per competizione nel where e non espone campi vietati", async () => {
    const prisma = await client();
    const { loadMediaPlayerCard, searchMediaPlayers } = await import("./verify");
    const suffix = randomBytes(4).toString("hex");

    const cupA = await prisma.competition.create({ data: { name: `Media A ${suffix}`, slug: `media-a-${suffix}` } });
    const cupB = await prisma.competition.create({ data: { name: `Media B ${suffix}`, slug: `media-b-${suffix}` } });
    const editionA = await prisma.edition.create({
      data: { competitionId: cupA.id, name: "2026", year: 2026 },
    });
    const editionB = await prisma.edition.create({
      data: { competitionId: cupB.id, name: "2026", year: 2026 },
    });
    const school = await prisma.school.create({ data: { name: `Istituto ${suffix}` } });
    const teamA = await prisma.team.create({
      data: {
        editionId: editionA.id,
        schoolId: school.id,
        name: "Alfa",
        inviteCode: `MA-${suffix}`,
        registrationToken: `tok-a-${suffix}`,
      },
    });
    const teamB = await prisma.team.create({
      data: {
        editionId: editionB.id,
        schoolId: school.id,
        name: "Beta",
        inviteCode: `MB-${suffix}`,
        registrationToken: `tok-b-${suffix}`,
      },
    });

    async function player(input: { email: string; teamId: string; editionId: string; lastName: string }) {
      const user = await prisma.user.create({ data: { email: input.email } });
      const profile = await prisma.playerProfile.create({
        data: {
          userId: user.id,
          firstName: "Luca",
          lastName: input.lastName,
          birthDate: new Date("2000-05-01T00:00:00.000Z"),
          fiscalCode: `${input.email[0]}${suffix}`.toUpperCase(),
          phone: "3330000000",
        },
      });
      const registration = await prisma.registration.create({
        data: {
          playerProfileId: profile.id,
          teamId: input.teamId,
          editionId: input.editionId,
          status: "APPROVED",
        },
      });
      await prisma.consentChoice.create({
        data: {
          userId: user.id,
          registrationId: registration.id,
          code: "M7",
          accepted: true,
          legalDocumentVersionId: null,
        },
      });
      return { user, profile, registration };
    }

    const inScope = await player({
      email: `a-${suffix}@media.test`,
      teamId: teamA.id,
      editionId: editionA.id,
      lastName: `Rossi${suffix}`,
    });
    const outOfScope = await player({
      email: `b-${suffix}@media.test`,
      teamId: teamB.id,
      editionId: editionB.id,
      lastName: `Rossi${suffix}`,
    });

    try {
      const hits = await searchMediaPlayers({ query: `Rossi${suffix}`, competitionIds: [cupA.id] });
      expect(hits.map((row) => row.registrationId)).toEqual([inScope.registration.id]);
      expect(hits[0]?.teamName).toBe("Alfa");
      expect(dtoLeaksForbiddenFields(hits)).toEqual([]);

      const allowed = await loadMediaPlayerCard({
        registrationId: inScope.registration.id,
        competitionIds: [cupA.id],
      });
      expect(allowed?.card.registrationId).toBe(inScope.registration.id);
      expect(dtoLeaksForbiddenFields(allowed?.card)).toEqual([]);

      const denied = await loadMediaPlayerCard({
        registrationId: outOfScope.registration.id,
        competitionIds: [cupA.id],
      });
      expect(denied).toBeNull();
    } finally {
      await prisma.consentChoice.deleteMany({ where: { user: { email: { contains: suffix } } } });
      await prisma.registration.deleteMany({ where: { teamId: { in: [teamA.id, teamB.id] } } });
      await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
      await prisma.playerProfile.deleteMany({ where: { user: { email: { contains: suffix } } } });
      await prisma.user.deleteMany({ where: { email: { contains: suffix } } });
      await prisma.school.delete({ where: { id: school.id } });
      await prisma.edition.deleteMany({ where: { id: { in: [editionA.id, editionB.id] } } });
      await prisma.competition.deleteMany({ where: { id: { in: [cupA.id, cupB.id] } } });
    }
  });
});
