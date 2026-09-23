import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/features/auth/domain/password";
import { LEGAL_CATALOG } from "../src/features/consents/domain/catalog";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL mancante");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertUser(email: string, password: string, name: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: new Date(),
    },
  });
}

async function ensureRole(userId: string, role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN") {
  const existing = await prisma.userRole.findFirst({ where: { userId, role } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, role } });
  }
}

async function main() {
  const superAdmin = await upsertUser(
    "super@gmail.com",
    "CiaoCiao",
    "Super Admin",
  );
  const orgAdmin = await upsertUser(
    "org@gmail.com",
    "CiaoCiao",
    "Organization Admin",
  );
  const rep = await upsertUser(
    "rep@gmail.com",
    "CiaoCiao",
    "Rappresentante Demo",
  );

  await ensureRole(superAdmin.id, "SUPER_ADMIN");
  await ensureRole(orgAdmin.id, "ORGANIZATION_ADMIN");

  const competition = await prisma.competition.upsert({
    where: { slug: "esl-demo" },
    update: {},
    create: {
      name: "ESL Demo Cup",
      slug: "esl-demo",
      description: "Edizione di sviluppo. Non è una coppa ufficiale.",
    },
  });

  const edition = await prisma.edition.upsert({
    where: {
      competitionId_year_name: {
        competitionId: competition.id,
        year: 2026,
        name: "2026",
      },
    },
    update: { isActive: true, playerFeeAmount: 40, teamFeeAmount: 200 },
    create: {
      competitionId: competition.id,
      name: "2026",
      year: 2026,
      paymentMode: "PLAYER",
      playerFeeAmount: 40,
      teamFeeAmount: 200,
      isActive: true,
    },
  });

  await prisma.documentType.upsert({
    where: { code: "MEDICAL_CERTIFICATE" },
    update: {},
    create: {
      code: "MEDICAL_CERTIFICATE",
      name: "Certificato medico agonistico",
      allowedMime: ["application/pdf", "image/jpeg", "image/png"],
      maxSizeBytes: 10_485_760,
      requiresExpiry: false,
    },
  });

  await prisma.editionRequirement.createMany({
    data: [
      { editionId: edition.id, code: "PERSONAL_DATA", required: true, appliesTo: "ALL" },
      { editionId: edition.id, code: "GUARDIAN_IF_MINOR", required: true, appliesTo: "MINOR" },
      { editionId: edition.id, code: "MEDICAL_CERT", required: true, appliesTo: "ALL" },
      { editionId: edition.id, code: "PRIVACY", required: true, appliesTo: "ALL" },
      { editionId: edition.id, code: "MEDIA_RELEASE", required: false, appliesTo: "ALL" },
      { editionId: edition.id, code: "PAYMENT", required: true, appliesTo: "ALL" },
    ],
    skipDuplicates: true,
  });

  const school = await prisma.school.upsert({
    where: { id: "seed-school-demo" },
    update: {},
    create: {
      id: "seed-school-demo",
      name: "Liceo Demo",
      city: "Italia",
    },
  });

  const team = await prisma.team.upsert({
    where: { inviteCode: "DEMO-TEAM" },
    update: { representativeUserId: rep.id },
    create: {
      editionId: edition.id,
      schoolId: school.id,
      name: "Liceo Demo",
      inviteCode: "DEMO-TEAM",
      registrationToken: randomBytes(32).toString("base64url"),
      contactName: "Rappresentante Demo",
      contactEmail: rep.email,
      representativeUserId: rep.id,
    },
  });

  const repRole = await prisma.userRole.findFirst({
    where: { userId: rep.id, role: "TEAM_REPRESENTATIVE", teamId: team.id },
  });
  if (!repRole) {
    await prisma.userRole.create({
      data: { userId: rep.id, role: "TEAM_REPRESENTATIVE", teamId: team.id },
    });
  }

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: rep.id } },
    update: { role: "REPRESENTATIVE" },
    create: { teamId: team.id, userId: rep.id, role: "REPRESENTATIVE" },
  });

  for (const item of LEGAL_CATALOG) {
    const body = await readFile(path.join(process.cwd(), "content/legal", `${item.slug}.md`), "utf8");
    const document = await prisma.legalDocument.upsert({
      where: { slug: item.slug },
      update: { title: item.title, audience: item.audience, requiredByDefault: item.requiredByDefault },
      create: {
        slug: item.slug,
        title: item.title,
        audience: item.audience,
        requiredByDefault: item.requiredByDefault,
      },
    });
    const current = await prisma.legalDocumentVersion.findFirst({
      where: { legalDocumentId: document.id, isCurrent: true },
    });
    if (!current) {
      await prisma.legalDocumentVersion.create({
        data: {
          legalDocumentId: document.id,
          version: "placeholder-1",
          body,
          effectiveAt: new Date(),
          isCurrent: true,
        },
      });
    }
  }

  console.info("Seed completato.");
  console.info("Rep:", rep.email);
  console.info("Team:", team.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
