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
    if (command === "clear-rate-limits") {
      await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: value } } });
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
