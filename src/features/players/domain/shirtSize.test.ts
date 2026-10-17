import { describe, expect, it } from "vitest";
import { isValidShirtSize, PLAYER_SHIRT_SIZE_VALUES, shirtSizeLabel } from "./shirtSize";

describe("taglie maglia organizzazione", () => {
  it("accetta solo le taglie previste", () => {
    expect(PLAYER_SHIRT_SIZE_VALUES).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    expect(isValidShirtSize("M")).toBe(true);
    expect(isValidShirtSize("XXL")).toBe(true);
    expect(isValidShirtSize("14")).toBe(false);
    expect(isValidShirtSize("3XL")).toBe(false);
    expect(isValidShirtSize(null)).toBe(false);
    expect(isValidShirtSize("")).toBe(false);
    expect(isValidShirtSize("XX")).toBe(false);
  });

  it("restituisce l’etichetta della taglia", () => {
    expect(shirtSizeLabel("M")).toBe("M");
    expect(shirtSizeLabel(null)).toBeNull();
  });
});
