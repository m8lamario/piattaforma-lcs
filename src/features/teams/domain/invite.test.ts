import { describe, expect, it } from "vitest";
import { decideRedeemPath, inspectInvite, inviteCreateBlocker, inviteOutcomeCode, redeemPathCode, type InviteRecord } from "./invite";
import { ERROR_CODES } from "@/shared/errors";

const now = new Date("2026-09-19T18:00:00.000Z");

function pending(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    status: "PENDING",
    email: "giocatore@esempio.it",
    firstName: "Anna",
    lastName: "Bianchi",
    expiresAt: new Date("2026-10-03T18:00:00.000Z"),
    teamId: "team-1",
    teamName: "Liceo Arnaldo",
    editionId: "edition-1",
    ...overrides,
  };
}

describe("inspectInvite", () => {
  it("tratta come invalid un token sconosciuto", () => {
    expect(inspectInvite(null, now).outcome).toBe("invalid");
  });

  it("scade un invito pending oltre expiresAt", () => {
    expect(
      inspectInvite(pending({ expiresAt: new Date("2026-09-01T00:00:00.000Z") }), now)
        .outcome,
    ).toBe("expired");
  });

  it("rifiuta inviti già usati o revocati", () => {
    expect(inspectInvite(pending({ status: "ACCEPTED" }), now).outcome).toBe(
      "already_used",
    );
    expect(inspectInvite(pending({ status: "REVOKED" }), now).outcome).toBe("revoked");
  });

  it("stesso esito per invito staff scaduto o revocato", () => {
    expect(
      inspectInvite(pending({ firstName: null, lastName: null, expiresAt: new Date("2026-09-01T00:00:00.000Z") }), now)
        .outcome,
    ).toBe("expired");
    expect(inspectInvite(pending({ status: "REVOKED", firstName: null, lastName: null }), now).outcome).toBe(
      "revoked",
    );
  });

  it("mappa esiti e path su codici errore stabili", () => {
    expect(inviteOutcomeCode("expired")).toBe(ERROR_CODES.INVITE_EXPIRED);
    expect(inviteOutcomeCode("already_used")).toBe(ERROR_CODES.INVITE_ALREADY_USED);
    expect(inviteOutcomeCode("revoked")).toBe(ERROR_CODES.INVITE_REVOKED);
    expect(redeemPathCode("wrong_session_email")).toBe(ERROR_CODES.INVITE_WRONG_SESSION);
    expect(redeemPathCode("edition_conflict")).toBe(ERROR_CODES.INVITE_EDITION_CONFLICT);
  });

  it("consente il redeem se pending e non scaduto", () => {
    const inspection = inspectInvite(pending(), now);
    expect(inspection.outcome).toBe("redeemable");
    if (inspection.outcome === "redeemable") {
      expect(inspection.email).toBe("giocatore@esempio.it");
      expect(inspection.teamName).toBe("Liceo Arnaldo");
    }
  });
});

describe("decideRedeemPath", () => {
  const inspection = inspectInvite(pending(), now);

  it("crea un account se l'email non esiste", () => {
    expect(
      decideRedeemPath({
        inspection,
        existingUser: null,
        session: null,
        existingRegistrations: [],
      }).path,
    ).toBe("create_account");
  });

  it("chiede il login se l'email ha già un account e non c'è sessione", () => {
    expect(
      decideRedeemPath({
        inspection,
        existingUser: { id: "user-1", email: "giocatore@esempio.it" },
        session: null,
        existingRegistrations: [],
      }).path,
    ).toBe("login_required");
  });

  it("collega l'account se la sessione è dell'email invitata", () => {
    expect(
      decideRedeemPath({
        inspection,
        existingUser: { id: "user-1", email: "giocatore@esempio.it" },
        session: { userId: "user-1", email: "giocatore@esempio.it" },
        existingRegistrations: [],
      }).path,
    ).toBe("attach_existing");
  });

  it("blocca una sessione con email diversa dall'invito", () => {
    expect(
      decideRedeemPath({
        inspection,
        existingUser: null,
        session: { userId: "other", email: "altra@esempio.it" },
        existingRegistrations: [],
      }).path,
    ).toBe("wrong_session_email");
  });

  it("riconosce chi è già nella stessa squadra", () => {
    expect(
      decideRedeemPath({
        inspection,
        existingUser: { id: "user-1", email: "giocatore@esempio.it" },
        session: { userId: "user-1", email: "giocatore@esempio.it" },
        existingRegistrations: [
          { editionId: "edition-1", teamId: "team-1", status: "ACCOUNT_CREATED" },
        ],
      }).path,
    ).toBe("already_on_team");
  });

  it("blocca una seconda edizione attiva (OD-017)", () => {
    const decision = decideRedeemPath({
      inspection,
      existingUser: { id: "user-1", email: "giocatore@esempio.it" },
      session: { userId: "user-1", email: "giocatore@esempio.it" },
      existingRegistrations: [
        { editionId: "edition-2", teamId: "team-9", status: "IN_PROGRESS" },
      ],
    });
    expect(decision).toEqual({ path: "edition_conflict", editionId: "edition-2" });
  });
});

describe("inviteCreateBlocker", () => {
  it("blocca un nuovo invito se il giocatore è già in squadra", () => {
    expect(
      inviteCreateBlocker("team-1", "edition-1", [
        { editionId: "edition-1", teamId: "team-1", status: "ACCOUNT_CREATED" },
      ]),
    ).toBe("already_on_team");
  });

  it("blocca un invito verso un'altra edizione attiva", () => {
    expect(
      inviteCreateBlocker("team-1", "edition-1", [
        { editionId: "edition-2", teamId: "team-9", status: "IN_PROGRESS" },
      ]),
    ).toBe("edition_conflict");
  });

  it("consente l'invito se non ci sono registrazioni attive", () => {
    expect(
      inviteCreateBlocker("team-1", "edition-1", [
        { editionId: "edition-2", teamId: "team-9", status: "WITHDRAWN" },
      ]),
    ).toBeNull();
    expect(
      inviteCreateBlocker("team-1", "edition-1", [
        { editionId: "edition-1", teamId: "team-1", status: "REMOVED" },
      ]),
    ).toBeNull();
  });
});
