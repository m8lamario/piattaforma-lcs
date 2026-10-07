import "dotenv/config";
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
  console.info("Rappresentante (senza squadra):", rep.email);
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
