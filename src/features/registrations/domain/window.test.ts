import { describe, expect, it } from "vitest";
import { isRegistrationWindowOpen, windowClosedReason } from "./window";

const now = new Date("2026-03-01T12:00:00.000Z");

describe("isRegistrationWindowOpen", () => {
  it("è aperta se attiva e senza date", () => {
    expect(
      isRegistrationWindowOpen(
        { isActive: true, registrationOpensAt: null, registrationClosesAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("è chiusa se l’edizione non è attiva", () => {
    expect(
      isRegistrationWindowOpen(
        { isActive: false, registrationOpensAt: null, registrationClosesAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      windowClosedReason(
        { isActive: false, registrationOpensAt: null, registrationClosesAt: null },
        now,
      ),
    ).toBe("inactive");
  });

  it("rispetta apertura e chiusura", () => {
    const edition = {
      isActive: true,
      registrationOpensAt: new Date("2026-02-01T00:00:00.000Z"),
      registrationClosesAt: new Date("2026-04-01T00:00:00.000Z"),
    };
    expect(isRegistrationWindowOpen(edition, now)).toBe(true);
    expect(isRegistrationWindowOpen(edition, new Date("2026-01-15T00:00:00.000Z"))).toBe(false);
    expect(windowClosedReason(edition, new Date("2026-01-15T00:00:00.000Z"))).toBe("not_open");
    expect(isRegistrationWindowOpen(edition, new Date("2026-05-01T00:00:00.000Z"))).toBe(false);
    expect(windowClosedReason(edition, new Date("2026-05-01T00:00:00.000Z"))).toBe("closed");
  });
});
