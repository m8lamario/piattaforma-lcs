import { describe, expect, it } from "vitest";
import { renderEmailMessage } from "./resend";

describe("template Resend di servizio", () => {
  it("elenca le versioni accettate con link, senza allegati", () => {
    const message = renderEmailMessage({
      to: "player@example.test",
      template: "REGISTRATION_RECEIVED",
      variables: {
        title: "Conferma",
        documents:
          "Informativa privacy (Versione placeholder-1): accettata\nhttps://hub.test/documenti-legali/privacy-policy/placeholder-1",
        areaUrl: "https://hub.test/area",
      },
    });
    expect(message.subject).toContain("documenti");
    expect(message.text).toContain("placeholder-1");
    expect(message.text).toContain("https://hub.test/documenti-legali/privacy-policy/placeholder-1");
    expect(message.text).toContain("https://hub.test/area");
    expect(message.text.toLowerCase()).not.toContain("allegat");
  });

  it("per il certificato indica solo l’area, senza motivo sanitario", () => {
    const approved = renderEmailMessage({
      to: "player@example.test",
      template: "DOCUMENT_APPROVED",
      variables: { title: "Certificato approvato", areaUrl: "https://hub.test/area" },
    });
    const rejected = renderEmailMessage({
      to: "player@example.test",
      template: "DOCUMENT_REJECTED",
      variables: { title: "Certificato da aggiornare", areaUrl: "https://hub.test/area" },
    });
    expect(approved.text).toContain("https://hub.test/area");
    expect(rejected.text).toContain("https://hub.test/area");
    expect(rejected.text.toLowerCase()).not.toContain("diagnosi");
    expect(rejected.text.toLowerCase()).not.toContain("motivo");
  });

  it("conferma l’iscrizione approvata con link all’area", () => {
    const message = renderEmailMessage({
      to: "player@example.test",
      template: "REGISTRATION_APPROVED",
      variables: { title: "Iscrizione approvata", areaUrl: "https://hub.test/area" },
    });
    expect(message.subject).toBe("Iscrizione approvata");
    expect(message.text).toContain("https://hub.test/area");
  });

  it("invia il link C1 e il doppio opt-in marketing", () => {
    const c1 = renderEmailMessage({
      to: "genitore@example.test",
      template: "CONSENT_C1",
      variables: {
        title: "Conferma",
        playerName: "Luca Bianchi",
        confirmUrl: "https://hub.test/conferma-genitore/token",
        summary: "Promemoria",
      },
    });
    const marketing = renderEmailMessage({
      to: "player@example.test",
      template: "CONSENT_MARKETING_OPTIN",
      variables: {
        title: "Marketing",
        confirmUrl: "https://hub.test/conferma-marketing/token",
      },
    });
    expect(c1.subject).toMatch(/privacy/i);
    expect(c1.text).toContain("https://hub.test/conferma-genitore/token");
    expect(marketing.text).toContain("https://hub.test/conferma-marketing/token");
  });
});
