import { describe, expect, it } from "vitest";
import { canDeleteEdition } from "./edition";

describe("canDeleteEdition", () => {
  it("blocca la cancellazione se ci sono iscrizioni", () => {
    expect(canDeleteEdition(0)).toBe(true);
    expect(canDeleteEdition(1)).toBe(false);
  });
});
