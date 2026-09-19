import { describe, expect, it } from "vitest";
import { isValidItalianPhone, normalizePhone } from "./phone";

describe("italian phone", () => {
  it("accetta cellulari e fissi italiani", () => {
    expect(isValidItalianPhone("3331234567")).toBe(true);
    expect(isValidItalianPhone("+39 333 1234567")).toBe(true);
    expect(isValidItalianPhone("02-12345678")).toBe(true);
  });

  it("rifiuta numeri incompleti o non italiani", () => {
    expect(isValidItalianPhone("123")).toBe(false);
    expect(isValidItalianPhone("1234567890")).toBe(false);
    expect(normalizePhone("+39 333-1234567")).toBe("+393331234567");
  });
});
