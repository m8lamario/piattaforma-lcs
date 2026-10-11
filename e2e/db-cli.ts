import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client";

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function client() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL mancante");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main() {
  const [command, value] = process.argv.slice(2);
  if (!command || !value) throw new Error("Uso: db-cli.ts <command> <value>");
  const prisma = client();
  try {
    if (command === "verify-email") {
      await prisma.user.update({ where: { email: value }, data: { emailVerified: new Date() } });
      process.stdout.write("ok");
      return;
    }
    if (command === "guardian-email-queued") {
      const user = await prisma.user.findUnique({ where: { email: value }, select: { id: true } });
      const count = user
        ? await prisma.emailMessage.count({
            where: { templateKey: "GUARDIAN_AUTHORIZE", userId: user.id },
          })
        : 0;
      process.stdout.write(String(count > 0));
      return;
    }
    if (command === "ensure-rep-password") {
      const { hashPassword, verifyPassword } = await import("../src/features/auth/domain/password");
      const passwordHash = await hashPassword("CiaoCiao");
      const user = await prisma.user.update({
        where: { email: value },
        data: { passwordHash },
        select: { id: true, passwordHash: true, lifecycleStatus: true },
      });
      const seedMatches = await verifyPassword("CiaoCiao", user.passwordHash);
      // #region agent log
      await fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
        body: JSON.stringify({
          sessionId: "9b8024",
          runId: "post-fix",
          hypothesisId: "A",
          location: "e2e/db-cli.ts:ensure-rep-password",
          message: "reset demo rep password to seed value",
          data: {
            userId: user.id,
            lifecycle: user.lifecycleStatus,
            seedMatches,
            dbHost: (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "none",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      process.stdout.write(seedMatches ? "ok" : "mismatch");
      return;
    }
    if (command === "ensure-e2e-team") {
      const user = await prisma.user.findUnique({ where: { email: value }, select: { id: true } });
      if (!user) throw new Error("Utente rappresentante assente");

      const competition = await prisma.competition.upsert({
        where: { slug: "e2e-playwright" },
        update: { name: "E2E Playwright Cup" },
        create: { slug: "e2e-playwright", name: "E2E Playwright Cup" },
      });
      const edition = await prisma.edition.upsert({
        where: {
          competitionId_year_name: {
            competitionId: competition.id,
            year: 2026,
            name: "E2E",
          },
        },
        update: {
          isActive: true,
          paymentMode: "PLAYER",
          playerFeeAmount: 40,
          registrationOpensAt: new Date(Date.now() - 86_400_000),
          registrationClosesAt: new Date(Date.now() + 365 * 86_400_000),
        },
        create: {
          competitionId: competition.id,
          name: "E2E",
          year: 2026,
          paymentMode: "PLAYER",
          playerFeeAmount: 40,
          teamFeeAmount: 200,
          isActive: true,
          registrationOpensAt: new Date(Date.now() - 86_400_000),
          registrationClosesAt: new Date(Date.now() + 365 * 86_400_000),
        },
      });
      await prisma.editionRequirement.createMany({
        data: [
          { editionId: edition.id, code: "PERSONAL_DATA", required: true, appliesTo: "ALL" },
          { editionId: edition.id, code: "GUARDIAN_IF_MINOR", required: true, appliesTo: "MINOR" },
          { editionId: edition.id, code: "MEDICAL_CERT", required: true, appliesTo: "ALL" },
          { editionId: edition.id, code: "PRIVACY", required: true, appliesTo: "ALL" },
          { editionId: edition.id, code: "MEDIA_RELEASE", required: true, appliesTo: "ALL" },
          { editionId: edition.id, code: "PAYMENT", required: true, appliesTo: "ALL" },
        ],
        skipDuplicates: true,
      });
      const school = await prisma.school.upsert({
        where: { id: "e2e-school-demo" },
        update: { name: "E2E Scuola" },
        create: { id: "e2e-school-demo", name: "E2E Scuola", city: "Torino" },
      });
      let team = await prisma.team.findFirst({
        where: { name: "E2E Squadra", editionId: edition.id },
      });
      if (!team) {
        team = await prisma.team.create({
          data: {
            editionId: edition.id,
            schoolId: school.id,
            name: "E2E Squadra",
            inviteCode: `T-${randomBytes(4).toString("hex").toUpperCase()}`,
            registrationToken: randomBytes(32).toString("base64url"),
            representativeUserId: user.id,
          },
        });
      } else if (team.representativeUserId !== user.id) {
        team = await prisma.team.update({
          where: { id: team.id },
          data: { representativeUserId: user.id },
        });
      }
      const role = await prisma.userRole.findFirst({
        where: { userId: user.id, role: "TEAM_REPRESENTATIVE", teamId: team.id },
      });
      if (!role) {
        await prisma.userRole.create({
          data: { userId: user.id, role: "TEAM_REPRESENTATIVE", teamId: team.id },
        });
      }
      // #region agent log
      await fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
        body: JSON.stringify({
          sessionId: "9b8024",
          runId: "post-fix",
          hypothesisId: "F",
          location: "e2e/db-cli.ts:ensure-e2e-team",
          message: "ensured isolated e2e team for demo rep",
          data: {
            teamId: team.id,
            editionId: edition.id,
            createdRole: !role,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      process.stdout.write(team.id);
      return;
    }
    if (command === "clear-rate-limits") {
      await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: value } } });
      if (value === "login") {
        const { verifyPassword } = await import("../src/features/auth/domain/password");
        const user = await prisma.user.findUnique({
          where: { email: "rep@gmail.com" },
          select: { id: true, passwordHash: true, lifecycleStatus: true },
        });
        const seedMatches = user?.passwordHash
          ? await verifyPassword("CiaoCiao", user.passwordHash)
          : false;
        // #region agent log
        await fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
          body: JSON.stringify({
            sessionId: "9b8024",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "e2e/db-cli.ts:clear-rate-limits",
            message: "seed password vs db hash",
            data: {
              found: Boolean(user),
              userId: user?.id ?? null,
              lifecycle: user?.lifecycleStatus ?? null,
              hasHash: Boolean(user?.passwordHash),
              hashLen: user?.passwordHash?.length ?? 0,
              hashPrefix: user?.passwordHash?.slice(0, 7) ?? null,
              seedMatches,
              dbHost: (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "none",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
      process.stdout.write("ok");
      return;
    }
    if (command === "replace-guardian-token") {
      const row = await prisma.guardianLinkToken.findFirst({
        where: {
          purpose: "AUTHORIZE",
          usedAt: null,
          registration: { playerProfile: { user: { email: value } } },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!row) throw new Error("Token di autorizzazione genitore assente");
      const token = randomBytes(32).toString("base64url");
      await prisma.guardianLinkToken.update({
        where: { id: row.id },
        data: { tokenHash: hashInviteToken(token) },
      });
      process.stdout.write(token);
      return;
    }
    throw new Error(`Comando sconosciuto: ${command}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
