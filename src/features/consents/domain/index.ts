/** Consensi versionati: catalogo documenti, pacchetto privacy, decisione media esplicita. */
export { LEGAL_CATALOG, legalEntryBySlug, isLegalCatalogSlug } from "./catalog";
export {
  MEDIA_RELEASE_SLUG,
  MINOR_PRIVACY_SLUG,
  PRIVACY_PACK_SLUGS,
  isMediaComplete,
  isPrivacyPackComplete,
  mediaDecisionFrom,
  privacySlugsFor,
} from "./pack";
