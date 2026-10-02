export type PartnerEntry = {
  name: string;
  city?: string;
  sector?: string;
  privacyUrl?: string;
};

export type PartnerList = {
  version: string;
  updatedAt: string | null;
  partners: PartnerEntry[];
};

const EMPTY: PartnerList = { version: "1.0", updatedAt: null, partners: [] };

export function parsePartnerList(raw: unknown): PartnerList {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY;
  const value = raw as Record<string, unknown>;
  const partners = Array.isArray(value.partners)
    ? value.partners.filter((row): row is PartnerEntry => {
        return Boolean(row && typeof row === "object" && typeof (row as PartnerEntry).name === "string" && (row as PartnerEntry).name.trim());
      })
    : [];
  return {
    version: typeof value.version === "string" ? value.version : "1.0",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    partners,
  };
}

export function partnersPublished(list: PartnerList) {
  return list.partners.length > 0;
}
