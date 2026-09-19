import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_CATALOG, privacyCatalogSlugs } from "./catalog";
import { MEDIA_RELEASE_SLUG, PRIVACY_PACK_SLUGS, privacySlugsFor } from "./pack";

describe("catalogo documenti legali", () => {
  it("ha slug unici e un file markdown con placeholder visibili", () => {
    const slugs = LEGAL_CATALOG.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of LEGAL_CATALOG) {
      const body = readFileSync(path.join(process.cwd(), "content/legal", `${item.slug}.md`), "utf8");
      expect(body).toContain("[INSERIRE");
      expect(body.toLowerCase()).not.toContain("gdpr compliant");
    }
  });

  it("non mette termini o cookie nel passo privacy del wizard", () => {
    expect(PRIVACY_PACK_SLUGS).not.toContain("terms");
    expect(PRIVACY_PACK_SLUGS).not.toContain("cookie-policy");
    expect(privacySlugsFor(true)).not.toContain("terms");
    expect(privacyCatalogSlugs(true)).toEqual(privacySlugsFor(true));
    expect(MEDIA_RELEASE_SLUG).toBe("media-release");
  });
});
