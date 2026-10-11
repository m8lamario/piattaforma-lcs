import { cookies } from "next/headers";
import { decodeConsent, mayLoadCategory } from "@/shared/cookies/consent";
import { CONSENT_COOKIE_NAME, optionalCategories } from "@/shared/cookies/inventory";
import { VercelInsightsRuntime } from "./VercelInsightsRuntime";

export async function VercelInsights() {
  const stored = decodeConsent((await cookies()).get(CONSENT_COOKIE_NAME)?.value);
  if (!mayLoadCategory("analytics", stored, optionalCategories())) return null;
  return <VercelInsightsRuntime />;
}
