import { describe, expect, it } from "vitest";
import { emailVerifyIdentifier, inspectEmailVerifyToken } from "./verify";

describe("email verification token", () => {
  const now = new Date("2026-10-06T12:00:00.000Z");

  it("namespaça l’identifier per email", () => {
    expect(emailVerifyIdentifier("Anna@Esempio.it")).toBe("email-verify:anna@esempio.it");
  });

  it("rifiuta un token assente, scaduto o già consumato", () => {
    expect(inspectEmailVerifyToken(null, now)).toBe("invalid");
    expect(inspectEmailVerifyToken({ expiresAt: new Date("2026-10-05T00:00:00.000Z") }, now)).toBe("expired");
    expect(inspectEmailVerifyToken({ expiresAt: new Date("2026-10-07T00:00:00.000Z") }, now)).toBe("ok");
  });
});
