import { readFile } from "node:fs/promises";
import path from "node:path";
import { parsePartnerList, partnersPublished, type PartnerList } from "@/features/consents/domain/partners";

export async function loadPartnerList(): Promise<PartnerList> {
  try {
    const raw = await readFile(path.join(process.cwd(), "content/legal/partners.json"), "utf8");
    return parsePartnerList(JSON.parse(raw));
  } catch {
    return parsePartnerList(null);
  }
}

export async function isPartnerBoxVisible() {
  return partnersPublished(await loadPartnerList());
}
