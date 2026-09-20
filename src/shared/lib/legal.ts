import { LEGAL_CATALOG, isLegalCatalogSlug } from "@/features/consents/domain/catalog";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Set(LEGAL_CATALOG.map((item) => item.slug));

export async function readLegalDocument(slug: string) {
  if (!isLegalCatalogSlug(slug) || !ALLOWED.has(slug)) {
    throw new Error("Documento legale sconosciuto.");
  }
  const file = path.join(process.cwd(), "content/legal", `${slug}.md`);
  return readFile(file, "utf8");
}

export async function legalFilesHavePlaceholders() {
  const bodies = await Promise.all(LEGAL_CATALOG.map((item) => readLegalDocument(item.slug)));
  return bodies.some((body) => body.includes("[INSERIRE"));
}
