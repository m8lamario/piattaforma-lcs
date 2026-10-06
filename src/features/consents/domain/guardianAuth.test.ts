import { describe, expect, it } from "vitest";
import {
  enrollmentBoxCodes,
  guardianAuthorizationChecklistStatus,
  inspectGuardianLink,
  publicationBoxCodes,
  selfAsGuardianReason,
} from "./guardianAuth";

describe("selfAsGuardianReason", () => {
  it("rifiuta l’email del minore come email del genitore", () => {
    expect(
      selfAsGuardianReason({
        playerFirstName: "Luca",
        playerLastName: "Bianchi",
        playerEmail: "luca@test.it",
        guardianFirstName: "Anna",
        guardianLastName: "Bianchi",
        guardianEmail: "LUCA@test.it",
      }),
    ).toBe("email");
  });

  it("rifiuta nome e cognome identici al minore", () => {
    expect(
      selfAsGuardianReason({
        playerFirstName: "Luca",
        playerLastName: "Bianchi",
        playerEmail: "luca@test.it",
        guardianFirstName: " luca ",
        guardianLastName: "BIANCHI",
        guardianEmail: "anna@test.it",
      }),
    ).toBe("name");
  });

  it("accetta un contatto distinto", () => {
    expect(
      selfAsGuardianReason({
        playerFirstName: "Luca",
        playerLastName: "Bianchi",
        playerEmail: "luca@test.it",
        guardianFirstName: "Anna",
        guardianLastName: "Bianchi",
        guardianEmail: "anna@test.it",
      }),
    ).toBeNull();
  });
});

describe("caselle del link genitore", () => {
  it("tiene G1 e salute nel pacchetto di iscrizione, distinti dalle foto", () => {
    const codes = enrollmentBoxCodes(false);
    expect(codes.slice(0, 5)).toEqual(["G1", "T1", "G2", "G3", "G4"]);
    expect(codes).toContain("G9");
    expect(codes).not.toContain("G7");
    expect(codes).not.toContain("G14");
    expect(enrollmentBoxCodes(true)).toContain("G7");
  });

  it("limita il secondo genitore a C1, cognome e usi", () => {
    expect(publicationBoxCodes(false)[0]).toBe("C1");
    expect(publicationBoxCodes(false)).toContain("G5");
    expect(publicationBoxCodes(false)).not.toContain("G4");
  });
});

describe("checklist tutore", () => {
  it("resta in attenzione finché manca l’autorizzazione", () => {
    expect(guardianAuthorizationChecklistStatus({ hasContact: true, enrollmentStatus: "PENDING" })).toBe(
      "attention",
    );
    expect(guardianAuthorizationChecklistStatus({ hasContact: true, enrollmentStatus: "REFUSED" })).toBe(
      "attention",
    );
    expect(guardianAuthorizationChecklistStatus({ hasContact: true, enrollmentStatus: "AUTHORIZED" })).toBe(
      "complete",
    );
    expect(guardianAuthorizationChecklistStatus({ hasContact: false, enrollmentStatus: null })).toBe("todo");
  });
});

describe("inspectGuardianLink", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const expiresAt = new Date("2026-10-13T12:00:00Z");

  it("rifiuta token già usato o scaduto", () => {
    expect(
      inspectGuardianLink({
        purpose: "AUTHORIZE",
        usedAt: now,
        expiresAt,
        authorization: { status: "OPENED" },
        now,
      }),
    ).toBe("used");
    expect(
      inspectGuardianLink({
        purpose: "AUTHORIZE",
        usedAt: null,
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        authorization: { status: "PENDING" },
        now,
      }),
    ).toBe("expired");
  });

  it("rifiuta un secondo uso dopo autorizzazione o rifiuto", () => {
    expect(
      inspectGuardianLink({
        purpose: "AUTHORIZE",
        usedAt: null,
        expiresAt,
        authorization: { status: "AUTHORIZED" },
        now,
      }),
    ).toBe("used");
    expect(
      inspectGuardianLink({
        purpose: "PUBLICATION",
        usedAt: null,
        expiresAt,
        authorization: { status: "REFUSED" },
        now,
      }),
    ).toBe("used");
  });

  it("accetta la revoca solo su un’autorizzazione ancora valida", () => {
    expect(
      inspectGuardianLink({
        purpose: "REVOKE",
        usedAt: null,
        expiresAt,
        authorization: { status: "PENDING" },
        now,
      }),
    ).toBe("invalid");
    expect(
      inspectGuardianLink({
        purpose: "REVOKE",
        usedAt: null,
        expiresAt,
        authorization: { status: "AUTHORIZED" },
        now,
      }),
    ).toBeNull();
  });
});
