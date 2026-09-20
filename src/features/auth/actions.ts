"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { loginSchema } from "@/features/auth/schemas/login";
import { changePasswordSchema, requestResetSchema, resetPasswordSchema } from "@/features/auth/schemas/account";
import { hashPassword, verifyPassword } from "@/features/auth/domain/password";
import { createInviteToken, isWellFormedInviteToken } from "@/features/teams/domain/token";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findPasswordResetByToken,
} from "@/features/auth/data/passwordReset";
import { emailAdapter } from "@/shared/adapters";
import { prisma } from "@/shared/lib/prisma";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit } from "@/shared/lib/request-guard";

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const loginKey = await clientKey("login");
  if (!(await consumeRateLimit(loginKey, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs))) {
    return { error: "Troppi tentativi. Riprova tra qualche minuto." };
  }

  const nextPath = String(formData.get("next") ?? "/area");
  const redirectTo = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/area";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo,
    });
    return { error: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o password non corretti." };
    }
    throw error;
  }
}

export async function logoutAction(formData?: FormData) {
  const next = String(formData?.get("next") ?? "/");
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  await signOut({ redirectTo });
}

export async function changePasswordAction(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/account");
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) return { error: "Account senza password locale." };
  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return { error: "La password attuale non è corretta." };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: "PASSWORD_CHANGE",
    entityType: "User",
    entityId: user.id,
  });
  return { ok: true };
}

export async function requestPasswordResetAction(
  _prev: { error?: string; sent?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  const generic = { sent: true as const };
  if (!parsed.success) return generic;
  const rateKey = await clientKey(`reset:${parsed.data.email}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs))) {
    return generic;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.passwordHash) {
    const token = createInviteToken();
    await createPasswordResetToken(parsed.data.email, token);
    const headerList = await headers();
    const resetUrl = `${originFromHeaders(headerList)}/recupera-password/${token}`;
    await emailAdapter.send({
      to: parsed.data.email,
      template: "password-reset",
      variables: { resetUrl, title: "Reimposta la password" },
    });
  }
  return generic;
}

export async function resetPasswordAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }
  if (!isWellFormedInviteToken(parsed.data.token)) {
    return { error: "Questo link non è valido o è già stato usato." };
  }
  const found = await findPasswordResetByToken(parsed.data.token);
  if (!found) {
    return { error: "Questo link non è valido o è già stato usato." };
  }
  const consumed = await consumePasswordResetToken(found.email, parsed.data.token);
  if (!consumed.ok) {
    return { error: "Questo link non è valido o è già stato usato." };
  }
  const user = await prisma.user.findUnique({ where: { email: found.email } });
  if (!user) {
    return { error: "Questo link non è valido o è già stato usato." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
  });
  redirect("/accedi");
}
