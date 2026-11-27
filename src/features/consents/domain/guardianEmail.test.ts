import { describe, expect, it } from "vitest";
import { hasUndeliverableGuardianEmail, projectGuardianEmailNotices } from "./guardianEmail";

describe("avviso email genitore", () => {
  it("segnala il bounce del contatto principale anche se l’altro ha già accettato", () => {
    const notices = projectGuardianEmailNotices({
      primary: { email: "mamma@test.it", open: true, delivery: "undeliverable" },
      secondary: { email: "papa@test.it", open: false, delivery: "delivered" },
    });
    expect(notices).toEqual([
      { kind: "primary", email: "mamma@test.it", tone: "danger", reason: "undeliverable" },
    ]);
    expect(hasUndeliverableGuardianEmail(notices)).toBe(true);
  });

  it("segnala il bounce dell’altro genitore anche dopo l’autorizzazione del primo", () => {
    const notices = projectGuardianEmailNotices({
      primary: { email: "mamma@test.it", open: false, delivery: "delivered" },
      secondary: { email: "papa@test.it", open: true, delivery: "undeliverable" },
    });
    expect(notices).toEqual([
      { kind: "secondary", email: "papa@test.it", tone: "danger", reason: "undeliverable" },
    ]);
  });

  it("in attesa senza bounce invita a controllare l’indirizzo, senza dire che è sbagliato", () => {
    const notices = projectGuardianEmailNotices({
      primary: { email: "mamma@test.it", open: true, delivery: "accepted" },
      secondary: { email: "papa@test.it", open: true, delivery: null },
    });
    expect(notices).toEqual([
      { kind: "primary", email: "mamma@test.it", tone: "warning", reason: "check_address" },
      { kind: "secondary", email: "papa@test.it", tone: "warning", reason: "check_address" },
    ]);
    expect(hasUndeliverableGuardianEmail(notices)).toBe(false);
  });

  it("non avvisa se il messaggio al primo genitore risulta consegnato e si aspetta solo il clic", () => {
    expect(
      projectGuardianEmailNotices({
        primary: { email: "mamma@test.it", open: true, delivery: "delivered" },
      }),
    ).toEqual([]);
  });

  it("dopo la consegna all’altro genitore resta l’attesa del clic", () => {
    const notices = projectGuardianEmailNotices({
      primary: { email: "mamma@test.it", open: false, delivery: "delivered" },
      secondary: { email: "papa@test.it", open: true, delivery: "delivered" },
    });
    expect(notices).toEqual([
      { kind: "secondary", email: "papa@test.it", tone: "warning", reason: "awaiting_confirmation" },
    ]);
    expect(hasUndeliverableGuardianEmail(notices)).toBe(false);
  });

  it("con invio accettato all’altro genitore chiede il clic, non solo il controllo dell’indirizzo", () => {
    expect(
      projectGuardianEmailNotices({
        secondary: { email: "papa@test.it", open: true, delivery: "accepted" },
      }),
    ).toEqual([{ kind: "secondary", email: "papa@test.it", tone: "warning", reason: "awaiting_confirmation" }]);
  });
});
