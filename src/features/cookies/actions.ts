"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  consentCookieOptions,
  decideConsentWrite,
  parseConsentIntent,
  safeReturnPath,
} from "@/shared/cookies/consent";
import { CONSENT_COOKIE_NAME, optionalCategories } from "@/shared/cookies/inventory";
import { shouldUseSecureCookie } from "@/shared/cookies/options";
import { loadActiveAdminView } from "@/shared/lib/readOnlyGuard";

async function persistConsent(formData: FormData) {
  if (await loadActiveAdminView()) {
    redirect(safeReturnPath(formData.get("returnTo")));
  }
  const headerList = await headers();
  const secure = shouldUseSecureCookie(headerList.get("x-forwarded-proto"));
  const decision = decideConsentWrite({
    optionalCategories: optionalCategories(),
    intent: parseConsentIntent(formData.get("intent")),
    analytics: formData.get("analytics") === "on",
    marketing: formData.get("marketing") === "on",
  });
  const jar = await cookies();
  if (decision.action === "delete") {
    jar.set(CONSENT_COOKIE_NAME, "", consentCookieOptions({ secure, maxAge: 0 }));
  } else {
    jar.set(
      CONSENT_COOKIE_NAME,
      decision.value,
      consentCookieOptions({ secure, maxAge: decision.maxAge }),
    );
  }
  redirect(safeReturnPath(formData.get("returnTo")));
}

export async function saveCookieConsentAction(formData: FormData) {
  await persistConsent(formData);
}

export async function revokeCookieConsentAction(formData: FormData) {
  formData.set("intent", "revoke");
  await persistConsent(formData);
}
