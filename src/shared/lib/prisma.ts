import { PrismaClient } from "@generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { enforceReadOnly, registerReadOnlyGuard } from "@/shared/lib/readOnlyGuard";

const globalForPrisma = globalThis as unknown as {
  unguardedPrisma: PrismaClient | undefined;
  prisma: PrismaClient | undefined;
};

function createBaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL non è configurata.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function guardClient(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          await enforceReadOnly(model, operation);
          return query(args);
        },
      },
      async $queryRaw({ args, query }) {
        await enforceReadOnly("$raw", "queryRaw");
        return query(args);
      },
      async $executeRaw({ args, query }) {
        await enforceReadOnly("$raw", "executeRaw");
        return query(args);
      },
      async $queryRawUnsafe({ args, query }) {
        await enforceReadOnly("$raw", "queryRawUnsafe");
        return query(args);
      },
      async $executeRawUnsafe({ args, query }) {
        await enforceReadOnly("$raw", "executeRawUnsafe");
        return query(args);
      },
    },
  });
}

/**
 * Client senza il blocco di sola lettura.
 * Solo Auth.js e il ciclo di vita della AdminViewSession possono usarlo:
 * chiudere la visualizzazione è l’unica scrittura ammessa mentre il cookie è attivo.
 */
export const unguardedPrisma = globalForPrisma.unguardedPrisma ?? createBaseClient();

registerReadOnlyGuard(unguardedPrisma);

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (guardClient(unguardedPrisma) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.unguardedPrisma = unguardedPrisma;
  globalForPrisma.prisma = prisma;
}
