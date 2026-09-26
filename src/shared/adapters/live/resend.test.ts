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
});
