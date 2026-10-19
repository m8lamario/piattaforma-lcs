import type { MediaConsentReason, MediaConsentState, MediaUseKey } from "@/features/media-partners/domain/verify";
import type { StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";

export function mediaStateLabel(state: MediaConsentState) {
  switch (state) {
    case "granted":
      return it.mediaStateGranted;
    case "denied":
      return it.mediaStateDenied;
    case "revoked":
      return it.mediaStateRevoked;
    case "not_collected":
      return it.mediaStateNotCollected;
    case "not_effective":
      return it.mediaStateNotEffective;
    default:
      return it.mediaStateUnverifiable;
  }
}

export function mediaStateTone(state: MediaConsentState): StatusTone {
  if (state === "granted") return "complete";
  if (state === "denied" || state === "revoked") return "danger";
  if (state === "not_effective" || state === "unverifiable") return "attention";
  return "neutral";
}

export function mediaHeadlineClass(state: MediaConsentState) {
  if (state === "granted") return "headlineGranted";
  if (state === "denied" || state === "revoked") return "headlineDenied";
  if (state === "not_effective" || state === "unverifiable") return "headlineAttention";
  return "headlineNeutral";
}

export function mediaReasonLabel(reason: MediaConsentReason | null) {
  switch (reason) {
    case "missing_birth_date":
      return it.mediaReasonMissingBirthDate;
    case "missing_version":
      return it.mediaReasonMissingVersion;
    case "publication_revoked":
      return it.mediaReasonPublicationRevoked;
    case "pending_other_parent":
      return it.mediaReasonPendingOtherParent;
    case "missing_g1":
      return it.mediaReasonMissingG1;
    case "missing_g14":
      return it.mediaReasonMissingG14;
    case "not_activated":
      return it.mediaReasonNotActivated;
    default:
      return null;
  }
}

export function mediaUseLabel(key: MediaUseKey) {
  switch (key) {
    case "channels":
      return it.mediaUseChannels;
    case "promotion":
      return it.mediaUsePromotion;
    case "sponsor":
      return it.mediaUseSponsor;
    case "press":
      return it.mediaUsePress;
    default:
      return it.mediaUseInterviews;
  }
}

export function mediaAgeLabel(band: "minor" | "adult" | "unverifiable") {
  if (band === "minor") return it.mediaAgeMinor;
  if (band === "adult") return it.mediaAgeAdult;
  return it.mediaAgeUnknown;
}
