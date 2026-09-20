import { describe, expect, it } from "vitest";
import { inspectResetToken, passwordResetIdentifier } from "./reset";

describe("password reset token", () => {
  it("rifiuta un token assente o scaduto (riuso dopo delete = invalid)", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("invalid");
    expect(inspectResetToken({ expiresAt: new Date("2026-02-01T00:00:00.000Z") }, now)).toBe("expired");
    expect(inspectResetToken({ expiresAt: new Date("2026-03-02T00:00:00.000Z") }, now)).toBe("ok");
  });

  it("namespaça l’identifier per email", () => {
    expect(passwordResetIdentifier("Anna@Esempio.it")).toBe("password-reset:anna@esempio.it");
  });
});
