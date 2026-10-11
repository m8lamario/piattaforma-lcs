import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { loginSchema } from "@/features/auth/schemas/login";
import { verifyPassword } from "@/features/auth/domain/password";
import { prisma } from "@/shared/lib/prisma";
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/shared/cookies/inventory";
import { logger } from "@/shared/lib/logger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  pages: {
    signIn: "/accedi",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        // #region agent log
        fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
          body: JSON.stringify({
            sessionId: "9b8024",
            runId: "pre-fix",
            hypothesisId: "B",
            location: "src/auth.ts:authorize",
            message: "login authorize parse",
            data: {
              schemaOk: parsed.success,
              passwordLen: parsed.success ? parsed.data.password.length : -1,
              emailLen: parsed.success ? parsed.data.email.length : -1,
              dbHost: (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "none",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || user.lifecycleStatus !== "ACTIVE") {
          // #region agent log
          fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
            body: JSON.stringify({
              sessionId: "9b8024",
              runId: "pre-fix",
              hypothesisId: "E",
              location: "src/auth.ts:authorize",
              message: "login denied unknown or inactive",
              data: {
                found: Boolean(user),
                hasHash: Boolean(user?.passwordHash),
                lifecycle: user?.lifecycleStatus ?? null,
                hashPrefix: user?.passwordHash?.slice(0, 7) ?? null,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          logger.warn("auth.login.denied", { reason: "unknown_or_no_password" });
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          // #region agent log
          fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b8024" },
            body: JSON.stringify({
              sessionId: "9b8024",
              runId: "pre-fix",
              hypothesisId: "A",
              location: "src/auth.ts:authorize",
              message: "login denied bad_password",
              data: {
                userId: user.id,
                passwordLen: parsed.data.password.length,
                hashLen: user.passwordHash.length,
                hashPrefix: user.passwordHash.slice(0, 7),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          logger.warn("auth.login.denied", { userId: user.id, reason: "bad_password" });
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
        const row = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { lifecycleStatus: true },
        });
        if (!row || row.lifecycleStatus !== "ACTIVE") {
          return {};
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
