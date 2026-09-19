import {
  LEGAL_CATALOG,
  mediaCatalogSlug,
  privacyCatalogSlugs,
  type WizardLegalSlug,
} from "./catalog";

export const PRIVACY_PACK_SLUGS = LEGAL_CATALOG.filter(
  (item) => item.wizardStep === "privacy" && item.audience !== "MINOR",
).map((item) => item.slug);

export const MINOR_PRIVACY_SLUG = LEGAL_CATALOG.find((item) => item.slug === "minor-privacy")!.slug;
export const MEDIA_RELEASE_SLUG = mediaCatalogSlug();

export type ConsentSlug = WizardLegalSlug;

export type CurrentConsent = {
  slug: string;
  versionId: string;
  isCurrent: boolean;
  accepted: boolean;
};

export function privacySlugsFor(isMinorPlayer: boolean): ConsentSlug[] {
  return privacyCatalogSlugs(isMinorPlayer);
}

export function isPrivacyPackComplete(
  isMinorPlayer: boolean,
  consents: CurrentConsent[],
) {
  return privacySlugsFor(isMinorPlayer).every((slug) =>
    consents.some(
      (consent) =>
        consent.slug === slug && consent.isCurrent && consent.accepted && Boolean(consent.versionId),
    ),
  );
}

export type MediaDecision = "none" | "accepted" | "refused";

export function mediaDecisionFrom(consents: CurrentConsent[]): MediaDecision {
  const current = consents.find((consent) => consent.slug === MEDIA_RELEASE_SLUG && consent.isCurrent);
  if (!current) return "none";
  return current.accepted ? "accepted" : "refused";
}

export function isMediaComplete(required: boolean, decision: MediaDecision) {
  if (decision === "accepted") return true;
  if (decision === "refused") return !required;
  return false;
}
