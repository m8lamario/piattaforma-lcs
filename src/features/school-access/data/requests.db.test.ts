import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { hashInviteToken } from "@/features/teams/domain/token";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function client() {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma;
}

describe.skipIf(!hasDatabase)("richiesta accesso scuola sul database", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    const prisma = await client();
    await prisma.$disconnect();
  });

  async function withFixture(
    run: (ctx: {
      editionId: string;
      email: string;
      schoolName: string;
      city: string;
    }) => Promise<void>,
  ) {
    const prisma = await client();
    const suffix = randomBytes(4).toString("hex");
    const competition = await prisma.competition.create({
      data: { name: `Access Cup ${suffix}`, slug: `access-${suffix}` },
    });
    const edition = await prisma.edition.create({
      data: { competitionId: competition.id, name: "2026", year: 2026, isActive: true },
    });
    const ctx = {
      editionId: edition.id,
      email: `rep-${suffix}@scuola.test`,
      schoolName: `Liceo ${suffix}`,
      city: "Brescia",
    };
    try {
      await run(ctx);
    } finally {
      await prisma.schoolRegistrationRequest.deleteMany({ where: { editionId: edition.id } });
      await prisma.team.deleteMany({ where: { editionId: edition.id } });
      await prisma.school.deleteMany({ where: { name: ctx.schoolName } });
      await prisma.user.deleteMany({ where: { email: { contains: suffix } } });
      await prisma.edition.delete({ where: { id: edition.id } });
      await prisma.competition.delete({ where: { id: competition.id } });
    }
  }

  it("crea una richiesta valida e rifiuta il duplicato", async () => {
    const { createSchoolAccessRequest } = await import("./requests");
    await withFixture(async (ctx) => {
      const first = await createSchoolAccessRequest({
        firstName: "Anna",
        lastName: "Bianchi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "INSTITUTE_REPRESENTATIVE",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(first.ok).toBe(true);

      const duplicate = await createSchoolAccessRequest({
        firstName: "Anna",
        lastName: "Bianchi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "TEACHER",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) expect(duplicate.code).toBe("SCHOOL_ACCESS_DUPLICATE");
    });
  });

  it("blocca una scuola già presente sull’edizione e un’email già User", async () => {
    const prisma = await client();
    const { createSchoolAccessRequest } = await import("./requests");
    await withFixture(async (ctx) => {
      const school = await prisma.school.create({ data: { name: ctx.schoolName, city: ctx.city } });
      await prisma.team.create({
        data: {
          name: ctx.schoolName,
          editionId: ctx.editionId,
          schoolId: school.id,
          inviteCode: `T-${randomBytes(4).toString("hex")}`,
          registrationToken: randomBytes(8).toString("hex"),
        },
      });
      const schoolExists = await createSchoolAccessRequest({
        firstName: "Luca",
        lastName: "Verdi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "INSTITUTE_REPRESENTATIVE",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(schoolExists.ok).toBe(false);
      if (!schoolExists.ok) expect(schoolExists.code).toBe("SCHOOL_ACCESS_SCHOOL_EXISTS");

      await prisma.team.deleteMany({ where: { schoolId: school.id } });
      await prisma.school.delete({ where: { id: school.id } });
      await prisma.user.create({ data: { email: ctx.email, passwordHash: "x" } });

      const emailTaken = await createSchoolAccessRequest({
        firstName: "Luca",
        lastName: "Verdi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "INSTITUTE_REPRESENTATIVE",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(emailTaken.ok).toBe(false);
      if (!emailTaken.ok) expect(emailTaken.code).toBe("SCHOOL_ACCESS_EMAIL_TAKEN");
    });
  });

  it("approva creando scuola, squadra e account senza password, poi attiva il token", async () => {
    const prisma = await client();
    const {
      activateSchoolAccessAccount,
      approveSchoolAccessRequest,
      createSchoolAccessRequest,
      findSchoolAccessByActivationToken,
      inspectSchoolAccessActivation,
    } = await import("./requests");

    await withFixture(async (ctx) => {
      const created = await createSchoolAccessRequest({
        firstName: "Anna",
        lastName: "Bianchi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "INSTITUTE_REPRESENTATIVE",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const reviewer = await prisma.user.create({
        data: { email: `oa-${ctx.email}`, roles: { create: { role: "ORGANIZATION_ADMIN" } } },
      });

      const approved = await approveSchoolAccessRequest({
        id: created.request.id,
        reviewedByUserId: reviewer.id,
        origin: "https://hub.test",
      });
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;

      const user = await prisma.user.findUnique({
        where: { email: ctx.email },
        include: { roles: true, teamMemberships: true },
      });
      expect(user?.passwordHash).toBeNull();
      expect(user?.roles.map((role) => role.role)).toEqual(["TEAM_REPRESENTATIVE"]);
      expect(user?.roles.some((role) => role.role === "ORGANIZATION_ADMIN" || role.role === "SUPER_ADMIN")).toBe(
        false,
      );
      expect(user?.teamMemberships.map((row) => row.role)).toEqual(["REPRESENTATIVE"]);

      const found = await findSchoolAccessByActivationToken(approved.token);
      expect(inspectSchoolAccessActivation(found)).toBe("ok");

      const expiredView = inspectSchoolAccessActivation(found, new Date(Date.now() + 20 * 24 * 60 * 60 * 1000));
      expect(expiredView).toBe("expired");

      await prisma.schoolRegistrationRequest.update({
        where: { id: created.request.id },
        data: { activationExpiresAt: new Date(Date.now() - 1000) },
      });
      const expiredActivate = await activateSchoolAccessAccount({ token: approved.token, password: "CiaoCiao1" });
      expect(expiredActivate.ok).toBe(false);
      if (!expiredActivate.ok) expect(expiredActivate.outcome).toBe("expired");
      await prisma.schoolRegistrationRequest.update({
        where: { id: created.request.id },
        data: { activationExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });

      const activated = await activateSchoolAccessAccount({ token: approved.token, password: "CiaoCiao1" });
      expect(activated.ok).toBe(true);

      const reused = await activateSchoolAccessAccount({ token: approved.token, password: "CiaoCiao2" });
      expect(reused.ok).toBe(false);
      if (!reused.ok) expect(reused.outcome).toBe("used");

      const after = await prisma.user.findUnique({ where: { email: ctx.email } });
      expect(after?.passwordHash).toBeTruthy();
      expect(after?.emailVerified).toBeTruthy();
    });
  });

  it("rifiuta una richiesta pending e non la riapprova", async () => {
    const prisma = await client();
    const { createSchoolAccessRequest, rejectSchoolAccessRequest, approveSchoolAccessRequest } = await import(
      "./requests"
    );
    await withFixture(async (ctx) => {
      const created = await createSchoolAccessRequest({
        firstName: "Anna",
        lastName: "Bianchi",
        email: ctx.email,
        phone: "3471234567",
        schoolName: ctx.schoolName,
        city: ctx.city,
        requesterRole: "OTHER",
        institutionalEmail: "",
        editionId: ctx.editionId,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const reviewer = await prisma.user.create({ data: { email: `oa-${ctx.email}` } });
      const rejected = await rejectSchoolAccessRequest({
        id: created.request.id,
        reviewedByUserId: reviewer.id,
        rejectionReason: "Dati non verificabili",
      });
      expect(rejected.ok).toBe(true);
      const again = await approveSchoolAccessRequest({
        id: created.request.id,
        reviewedByUserId: reviewer.id,
        origin: "https://hub.test",
      });
      expect(again.ok).toBe(false);
      if (!again.ok) expect(again.code).toBe("SCHOOL_ACCESS_NOT_PENDING");
    });
  });

  it("applica l’indice unico sulle richieste pending", async () => {
    const prisma = await client();
    await withFixture(async (ctx) => {
      await prisma.schoolRegistrationRequest.create({
        data: {
          firstName: "A",
          lastName: "B",
          email: ctx.email,
          phone: "3471234567",
          schoolName: ctx.schoolName,
          schoolNameKey: ctx.schoolName.toLowerCase(),
          city: ctx.city,
          requesterRole: "TEACHER",
          editionId: ctx.editionId,
        },
      });
      await expect(
        prisma.schoolRegistrationRequest.create({
          data: {
            firstName: "C",
            lastName: "D",
            email: ctx.email,
            phone: "3470000000",
            schoolName: `${ctx.schoolName} Bis`,
            schoolNameKey: `${ctx.schoolName} bis`.toLowerCase(),
            city: ctx.city,
            requesterRole: "OTHER",
            editionId: ctx.editionId,
          },
        }),
      ).rejects.toThrow();
    });
  });

  it("non trova un token hashato diverso dal plaintext", async () => {
    const prisma = await client();
    await withFixture(async (ctx) => {
      await prisma.schoolRegistrationRequest.create({
        data: {
          firstName: "A",
          lastName: "B",
          email: ctx.email,
          phone: "3471234567",
          schoolName: ctx.schoolName,
          schoolNameKey: ctx.schoolName.toLowerCase(),
          city: ctx.city,
          requesterRole: "TEACHER",
          editionId: ctx.editionId,
          status: "APPROVED",
          activationTokenHash: hashInviteToken("token-in-chiaro-non-salvato-xxxxxxxxxxxx"),
          activationExpiresAt: new Date(Date.now() + 60_000),
        },
      });
      const found = await prisma.schoolRegistrationRequest.findUnique({
        where: { activationTokenHash: "token-in-chiaro-non-salvato-xxxxxxxxxxxx" },
      });
      expect(found).toBeNull();
    });
  });
});
