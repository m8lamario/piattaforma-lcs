export const PRIVACY_PACK_SLUGS = [
  "privacy-policy",
  "document-processing",
] as const;

export const MINOR_PRIVACY_SLUG = "minor-privacy";
export const MEDIA_RELEASE_SLUG = "media-release";

export type ConsentSlug =
  | (typeof PRIVACY_PACK_SLUGS)[number]
  | typeof MINOR_PRIVACY_SLUG
  | typeof MEDIA_RELEASE_SLUG;

export type CurrentConsent = {
  slug: string;
  versionId: string;
  isCurrent: boolean;
  accepted: boolean;
};

export function privacySlugsFor(isMinorPlayer: boolean): ConsentSlug[] {
  if (isMinorPlayer) {
    return [...PRIVACY_PACK_SLUGS, MINOR_PRIVACY_SLUG];
  }
  return [...PRIVACY_PACK_SLUGS];
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
