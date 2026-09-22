import { describe, expect, it } from "vitest";
import { shouldCompletePaymentOnReturn } from "./drivers";

describe("shouldCompletePaymentOnReturn", () => {
  it("completa l’esito solo con lo stub", () => {
    expect(shouldCompletePaymentOnReturn("stub")).toBe(true);
    expect(shouldCompletePaymentOnReturn("stripe")).toBe(false);
  });
});
