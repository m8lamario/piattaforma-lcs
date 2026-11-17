import { describe, expect, it } from "vitest";
import { leagueRegistrationSelect } from "./select";

describe("leagueRegistrationSelect", () => {
  it("non include file medici, PII extra o pagamenti dettagliati", () => {
    const encoded = JSON.stringify(leagueRegistrationSelect);
    expect(encoded).not.toContain("storageKey");
    expect(encoded).not.toContain("reason");
    expect(encoded).not.toContain("anomalies");
    expect(encoded).not.toContain("receiptUrl");
    expect(encoded).not.toContain("fiscalCode");
    expect(encoded).not.toContain("originalFilename");
    expect(encoded).not.toContain("mimeType");
    expect(encoded).toContain("firstName");
    expect(encoded).toContain("expiresAt");
  });
});
