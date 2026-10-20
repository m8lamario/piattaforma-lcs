import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/features/auth/domain/password";
import { LEGAL_CATALOG } from "../src/features/consents/domain/catalog";
import { MAX_UPLOAD_BYTES } from "../src/shared/config/app";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL mancante");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const EDITION_REQUIREMENTS = [
  { code: "PERSONAL_DATA" as const, required: true, appliesTo: "ALL" as const },
  { code: "GUARDIAN_IF_MINOR" as const, required: true, appliesTo: "MINOR" as const },
  { code: "MEDICAL_CERT" as const, required: true, appliesTo: "ALL" as const },
  { code: "PRIVACY" as const, required: true, appliesTo: "ALL" as const },
  { code: "MEDIA_RELEASE" as const, required: true, appliesTo: "ALL" as const },
  { code: "PAYMENT" as const, required: true, appliesTo: "ALL" as const },
];

const CUPS = [
  { name: "Leonessa Cup", slug: "leonessa-cup" },
  { name: "Ferrea Cup", slug: "ferrea-cup" },
  { name: "Mole Cup", slug: "mole-cup" },
  { name: "Colosseo Cup", slug: "colosseo-cup" },
  { name: "Turas Cup", slug: "turas-cup" },
  { name: "Olympius Cup", slug: "olympius-cup" },
];

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

async function removeEslDemoCup() {
  const competition = await prisma.competition.findUnique({
    where: { slug: "esl-demo" },
    include: { editions: true },
  });
  if (!competition) {
    return;
  }

  const editionIds = competition.editions.map((edition) => edition.id);

  await prisma.payment.deleteMany({ where: { editionId: { in: editionIds } } });
  await prisma.registration.deleteMany({ where: { editionId: { in: editionIds } } });
  await prisma.schoolRegistrationRequest.deleteMany({ where: { editionId: { in: editionIds } } });
  await prisma.team.deleteMany({ where: { editionId: { in: editionIds } } });
  await prisma.edition.deleteMany({ where: { competitionId: competition.id } });
  await prisma.competition.delete({ where: { id: competition.id } });

  await prisma.school.deleteMany({ where: { id: "seed-school-demo" } });
}

async function ensureEmptyCup(name: string, slug: string) {
  const competition = await prisma.competition.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
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

  await prisma.editionRequirement.createMany({
    data: EDITION_REQUIREMENTS.map((requirement) => ({
      editionId: edition.id,
      ...requirement,
    })),
    skipDuplicates: true,
  });

  return competition;
}

const SEED_REP_SCHOOL_ID = "seed-school-rep-demo";
const SEED_REP_TEAM_ID = "seed-team-rep-demo";

async function ensureRepDemoTeam(input: { userId: string; email: string; editionId: string }) {
  const school = await prisma.school.upsert({
    where: { id: SEED_REP_SCHOOL_ID },
    update: { name: "Liceo Demo Seed", city: "Torino" },
    create: { id: SEED_REP_SCHOOL_ID, name: "Liceo Demo Seed", city: "Torino" },
  });

  const team = await prisma.team.upsert({
    where: { id: SEED_REP_TEAM_ID },
    update: {
      editionId: input.editionId,
      schoolId: school.id,
      name: "Squadra Demo Rappresentante",
      representativeUserId: input.userId,
      contactName: "Rappresentante Demo",
      contactEmail: input.email,
    },
    create: {
      id: SEED_REP_TEAM_ID,
      editionId: input.editionId,
      schoolId: school.id,
      name: "Squadra Demo Rappresentante",
      inviteCode: "SEED-REP01",
      registrationToken: "seed-rep-demo-registration-token",
      representativeUserId: input.userId,
      contactName: "Rappresentante Demo",
      contactEmail: input.email,
    },
  });

  const repRole = await prisma.userRole.findFirst({
    where: { userId: input.userId, role: "TEAM_REPRESENTATIVE", teamId: team.id },
  });
  if (!repRole) {
    await prisma.userRole.create({
      data: { userId: input.userId, role: "TEAM_REPRESENTATIVE", teamId: team.id },
    });
  }

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: input.userId } },
    update: { role: "REPRESENTATIVE" },
    create: { teamId: team.id, userId: input.userId, role: "REPRESENTATIVE" },
  });

  return team;
}

async function main() {
  const superAdmin = await upsertUser(
    "it@estudentsleague.it",
    "CiaoCiao",
    "Super Admin",
  );
  const orgAdmin = await upsertUser(
    "amministrazione@estudentsleague.it",
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

  await removeEslDemoCup();

  const cups = [];
  for (const cup of CUPS) {
    cups.push(await ensureEmptyCup(cup.name, cup.slug));
  }

  const leonessaEdition = await prisma.edition.findFirst({
    where: { year: 2026, competition: { slug: "leonessa-cup" } },
    select: { id: true },
  });
  if (!leonessaEdition) {
    throw new Error("Edizione Leonessa Cup 2026 non trovata dopo il seed delle coppe.");
  }
  const repTeam = await ensureRepDemoTeam({
    userId: rep.id,
    email: rep.email,
    editionId: leonessaEdition.id,
  });

  await prisma.documentType.upsert({
    where: { code: "MEDICAL_CERTIFICATE" },
    update: { maxSizeBytes: MAX_UPLOAD_BYTES },
    create: {
      code: "MEDICAL_CERTIFICATE",
      name: "Certificato medico agonistico",
      allowedMime: ["application/pdf", "image/jpeg", "image/png"],
      maxSizeBytes: MAX_UPLOAD_BYTES,
      requiresExpiry: false,
    },
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
  console.info("Super Admin:", superAdmin.email);
  console.info("Organization Admin:", orgAdmin.email);
  console.info("Rappresentante:", rep.email, "→", repTeam.name, "(Leonessa Cup 2026)");
  console.info("Coppe:", cups.map((cup) => cup.name).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
