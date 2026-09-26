import { legalVersionPublicPath } from "./catalog";

export type ConsentSnapshot = {
  slug: string;
  version: string;
  title: string;
  accepted: boolean;
  acceptedAt: number;
};

export type ConsentReceiptRow = {
  title: string;
  version: string;
  accepted: boolean;
  url: string;
};

export function legalVersionAbsoluteUrl(slug: string, version: string, origin: string) {
  return `${origin.replace(/\/$/, "")}${legalVersionPublicPath(slug, version)}`;
}

export function latestConsentSnapshots(records: ConsentSnapshot[]): ConsentSnapshot[] {
  const bySlug = new Map<string, ConsentSnapshot>();
  for (const record of records) {
    const current = bySlug.get(record.slug);
    if (!current || record.acceptedAt > current.acceptedAt) {
      bySlug.set(record.slug, record);
    }
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function consentReceiptFingerprint(records: ConsentSnapshot[]): string {
  return latestConsentSnapshots(records)
    .map((row) => `${row.slug}:${row.version}:${row.accepted ? "1" : "0"}`)
    .join("|");
}

export function consentReceiptRows(records: ConsentSnapshot[], origin: string): ConsentReceiptRow[] {
  return latestConsentSnapshots(records).map((row) => ({
    title: row.title,
    version: row.version,
    accepted: row.accepted,
    url: legalVersionAbsoluteUrl(row.slug, row.version, origin),
  }));
}
