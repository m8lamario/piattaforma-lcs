import { describe, expect, it } from "vitest";
import { parsePartnerList, partnersPublished } from "./partners";

describe("elenco partner", () => {
  it("nasconde la casella se l’elenco è vuoto", () => {
    expect(partnersPublished(parsePartnerList(null))).toBe(false);
    expect(partnersPublished(parsePartnerList({ version: "1.0", partners: [] }))).toBe(false);
  });

  it("mostra la casella solo con almeno un nome", () => {
    expect(
      partnersPublished(
        parsePartnerList({
          version: "2.0",
          updatedAt: "2026-01-01",
          partners: [{ name: "Sponsor Srl" }],
        }),
      ),
    ).toBe(true);
  });
});
