/**
 * Inventario dei documenti legali versionati.
 * I testi in `content/legal/{slug}.md` sono placeholder: non sono informative valide.
 *
 * Wizard: solo i documenti con `wizardStep`.
 * Pagine pubbliche: `publicPath` (stili esistenti di `/privacy`).
 */
export const LEGAL_CATALOG = [
  {
    slug: "privacy-policy",
    title: "Informativa privacy",
    audience: "ALL" as const,
    requiredByDefault: true,
    wizardStep: "privacy" as const,
    publicPath: "/privacy",
  },
  {
    slug: "document-processing",
    title: "Informativa documenti caricati",
    audience: "ALL" as const,
    requiredByDefault: true,
    wizardStep: "privacy" as const,
    publicPath: "/privacy/documenti",
  },
  {
    slug: "minor-privacy",
    title: "Informativa per minori",
    audience: "MINOR" as const,
    requiredByDefault: true,
    wizardStep: "privacy" as const,
    publicPath: "/privacy/minori",
  },
  {
    slug: "media-release",
    title: "Liberatoria foto, video e social",
    audience: "ALL" as const,
    requiredByDefault: false,
    wizardStep: "liberatorie" as const,
    publicPath: "/liberatorie",
  },
  {
    slug: "terms",
    title: "Condizioni di iscrizione e uso",
    audience: "ALL" as const,
    requiredByDefault: false,
    wizardStep: null,
    publicPath: "/termini",
  },
  {
    slug: "cookie-policy",
    title: "Informativa cookie e tracciamenti",
    audience: "ALL" as const,
    requiredByDefault: false,
    wizardStep: null,
    publicPath: "/cookie",
  },
] as const;

export type LegalCatalogEntry = (typeof LEGAL_CATALOG)[number];
export type LegalCatalogSlug = LegalCatalogEntry["slug"];
export type LegalAudience = LegalCatalogEntry["audience"];
export type WizardLegalSlug = Extract<
  LegalCatalogEntry,
  { wizardStep: "privacy" | "liberatorie" }
>["slug"];

function isPrivacyWizardDoc(
  item: LegalCatalogEntry,
): item is Extract<LegalCatalogEntry, { wizardStep: "privacy" }> {
  return item.wizardStep === "privacy";
}

export const LEGAL_SLUGS: LegalCatalogSlug[] = LEGAL_CATALOG.map((item) => item.slug);

export function legalEntryBySlug(slug: string): LegalCatalogEntry | undefined {
  return LEGAL_CATALOG.find((item) => item.slug === slug);
}

export function isLegalCatalogSlug(slug: string): slug is LegalCatalogSlug {
  return LEGAL_CATALOG.some((item) => item.slug === slug);
}

export function privacyCatalogSlugs(isMinorPlayer: boolean): WizardLegalSlug[] {
  return LEGAL_CATALOG.filter(
    (item): item is Extract<LegalCatalogEntry, { wizardStep: "privacy" }> =>
      isPrivacyWizardDoc(item) && (item.audience !== "MINOR" || isMinorPlayer),
  ).map((item) => item.slug);
}

export function mediaCatalogSlug(): WizardLegalSlug {
  const entry = LEGAL_CATALOG.find((item) => item.wizardStep === "liberatorie");
  if (!entry) {
    throw new Error("Catalogo legale: manca il documento media.");
  }
  return entry.slug;
}
