"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/features/auth/schemas/login";
import { RATE_LIMITS, clientKey, consumeRateLimit } from "@/shared/lib/request-guard";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const loginKey = await clientKey("login");
  if (!consumeRateLimit(loginKey, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs)) {
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
