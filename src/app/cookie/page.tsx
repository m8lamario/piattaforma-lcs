import { CookiePreferences } from "@/features/cookies/ui/CookiePreferences";
import { LegalPublicArticle } from "@/features/consents/ui/LegalPublicArticle";

export default function CookiePolicyPage() {
  return <LegalPublicArticle slug="cookie-policy" afterProse={<CookiePreferences />} />;
}
