import { describe, expect, it } from "vitest";
import { reconcilePrivacyDraft } from "./privacyDraft";

describe("privacyDraft", () => {
  it("riprende letture e spunte se le versioni coincidono", () => {
    const next = reconcilePrivacyDraft(
      {
        versionIds: { terms: "v1" },
        readSlugs: { terms: true },
        checkedSlugs: { terms: true },
        boxValues: { M4: true },
      },
      { terms: "v1" },
      { M3: true },
    );
    expect(next.readSlugs.terms).toBe(true);
    expect(next.checkedSlugs.terms).toBe(true);
    expect(next.boxValues).toEqual({ M3: true, M4: true });
  });

  it("azzera le letture se la versione del documento è cambiata", () => {
    const next = reconcilePrivacyDraft(
      {
        versionIds: { terms: "v1" },
        readSlugs: { terms: true },
        checkedSlugs: { terms: true },
        boxValues: { M4: true },
      },
      { terms: "v2" },
      { M3: true },
    );
    expect(next.readSlugs).toEqual({});
    expect(next.checkedSlugs).toEqual({});
    expect(next.boxValues).toEqual({ M3: true });
  });
});
