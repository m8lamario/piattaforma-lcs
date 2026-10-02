import { describe, expect, it } from "vitest";
import { hasCompleteGuardian, hasMinorGuardianRequirement } from "./personal";

describe("requisito tutore", () => {
  const primary = {
    firstName: "Maria",
    lastName: "Rossi",
    relationship: "GENITORE",
    email: "maria@example.test",
    phone: "+390212345678",
  };

  it("è completo con unico esercente", () => {
    expect(hasCompleteGuardian(primary)).toBe(true);
    expect(hasMinorGuardianRequirement({ primary, g3: "SOLE" })).toBe(true);
  });

  it("con altro genitore richiede la seconda email", () => {
    expect(hasMinorGuardianRequirement({ primary, g3: "OTHER_PARENT" })).toBe(false);
    expect(
      hasMinorGuardianRequirement({
        primary,
        g3: "OTHER_PARENT",
        secondaryEmail: "altro@example.test",
      }),
    ).toBe(true);
  });
});
