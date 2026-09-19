import { readFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Set([
  "privacy-policy",
  "document-processing",
  "minor-privacy",
  "media-release",
]);

export async function readLegalDocument(slug: string) {
  if (!ALLOWED.has(slug)) {
    throw new Error("Documento legale sconosciuto.");
  }
  const file = path.join(process.cwd(), "content/legal", `${slug}.md`);
  return readFile(file, "utf8");
}
