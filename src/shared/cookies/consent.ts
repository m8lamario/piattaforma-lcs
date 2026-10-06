import {
  CONSENT_MAX_AGE_SECONDS,
  type CookieCategory,
  type OptionalTechnology,
} from "@/shared/cookies/inventory";

export type OptionalConsent = {
  v: 1;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentIntent = "accept" | "reject" | "custom" | "revoke" | "invalid";

export type ConsentWrite =
  | { action: "delete" }
  | { action: "set"; value: string; maxAge: number };

const CONSENT_PATTERN = /^v1\.(a0|a1)\.(m0|m1)$/;

export function encodeConsent(choice: OptionalConsent) {
  return `v1.${choice.analytics ? "a1" : "a0"}.${choice.marketing ? "m1" : "m0"}`;
}

export function decodeConsent(value: string | undefined | null): OptionalConsent | null {
  if (!value) return null;
  const match = CONSENT_PATTERN.exec(value);
  if (!match) return null;
  return {
    v: 1,
    analytics: match[1] === "a1",
    marketing: match[2] === "m1",
  };
}

export function parseConsentIntent(value: FormDataEntryValue | null): ConsentIntent {
  if (value === "accept" || value === "reject" || value === "custom" || value === "revoke") {
    return value;
  }
  return "invalid";
}

export function mayLoadCategory(
  category: CookieCategory,
  stored: OptionalConsent | null,
  active: ReadonlyArray<OptionalTechnology["category"]>,
) {
  if (category === "necessary") return true;
  if (!active.includes(category)) return false;
  if (!stored) return false;
  return stored[category] === true;
}

export function shouldShowCookieBanner(optionalCount: number, stored: OptionalConsent | null) {
  return optionalCount > 0 && stored === null;
}

export function decideConsentWrite(input: {
  optionalCategories: ReadonlyArray<OptionalTechnology["category"]>;
  intent: ConsentIntent;
  analytics: boolean;
  marketing: boolean;
}): ConsentWrite {
  if (input.intent === "revoke" || input.intent === "invalid" || input.optionalCategories.length === 0) {
    return { action: "delete" };
  }

  const allowAnalytics = input.optionalCategories.includes("analytics");
  const allowMarketing = input.optionalCategories.includes("marketing");
  let analytics = false;
  let marketing = false;
  if (input.intent === "accept") {
    analytics = allowAnalytics;
    marketing = allowMarketing;
  } else if (input.intent === "custom") {
    analytics = allowAnalytics && input.analytics;
    marketing = allowMarketing && input.marketing;
  }

  return {
    action: "set",
    value: encodeConsent({ v: 1, analytics, marketing }),
    maxAge: CONSENT_MAX_AGE_SECONDS,
  };
}

export function consentCookieOptions(input: { secure: boolean; maxAge: number }) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: input.secure,
    maxAge: input.maxAge,
  };
}

export function safeReturnPath(value: FormDataEntryValue | null) {
  const raw = String(value ?? "/cookie");
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") && !raw.includes("\n")) {
    return raw;
  }
  return "/cookie";
}
