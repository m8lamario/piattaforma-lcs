import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Placeholder only so `prisma generate` can load config without a live DB. */
const generatePlaceholder =
  "postgresql://postgres:postgres@localhost:5432/esl_player_hub?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? generatePlaceholder,
  },
});

