/** Consensi versionati: catalogo documenti, pacchetto privacy, decisione media esplicita. */
export { LEGAL_CATALOG, legalEntryBySlug, isLegalCatalogSlug, legalVersionPublicPath } from "./catalog";
export {
  MEDIA_RELEASE_SLUG,
  MINOR_PRIVACY_SLUG,
  PRIVACY_PACK_SLUGS,
  isConsentReceiptReady,
  isMediaComplete,
  isPrivacyPackComplete,
  mediaDecisionFrom,
  privacySlugsFor,
} from "./pack";
export {
  consentReceiptFingerprint,
  consentReceiptRows,
  latestConsentSnapshots,
  legalVersionAbsoluteUrl,
} from "./receipt";
export {
  CONSENT_BOXES,
  mediaBoxesRecorded,
  privacyBoxesComplete,
  publicationFlags,
} from "./boxes";
