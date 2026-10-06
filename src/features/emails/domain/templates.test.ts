import { describe, expect, it } from "vitest";
import { interpolateTemplate, invalidTemplateVariables, redactSecretVariables } from "./variables";
import { defaultEmailTemplates, renderEmailContent } from "./templates";

function render(key: keyof ReturnType<typeof defaultEmailTemplates>, variables: Record<string, string>) {
  return renderEmailContent({ template: defaultEmailTemplates()[key], variables });
}

describe("template email", () => {
  it("elenca le versioni accettate con link, senza allegati", () => {
    const message = render("REGISTRATION_RECEIVED", {
      documents:
        "Informativa privacy (Versione placeholder-1): accettata\nhttps://hub.test/documenti-legali/privacy-policy/placeholder-1",
      areaUrl: "https://hub.test/area",
    });
    expect(message.subject).toContain("documenti");
    expect(message.text).toContain("placeholder-1");
    expect(message.text).toContain("https://hub.test/documenti-legali/privacy-policy/placeholder-1");
    expect(message.text).toContain("https://hub.test/area");
    expect(message.text.toLowerCase()).not.toContain("allegat");
  });

  it("per il certificato indica solo l’area, senza motivo sanitario", () => {
    const approved = render("DOCUMENT_APPROVED", {
      title: "Certificato approvato",
      areaUrl: "https://hub.test/area",
    });
    const rejected = render("DOCUMENT_REJECTED", {
      title: "Certificato da aggiornare",
      areaUrl: "https://hub.test/area",
    });
    expect(approved.text).toContain("https://hub.test/area");
    expect(rejected.text).toContain("https://hub.test/area");
    expect(rejected.text.toLowerCase()).not.toContain("diagnosi");
    expect(rejected.text.toLowerCase()).not.toContain("motivo");
  });

  it("conferma l’iscrizione approvata con link all’area", () => {
    const message = render("REGISTRATION_APPROVED", {
      title: "Iscrizione approvata",
      areaUrl: "https://hub.test/area",
    });
    expect(message.subject).toBe("Iscrizione approvata");
    expect(message.text).toContain("https://hub.test/area");
  });

  it("invia il link C1 e il doppio opt-in marketing", () => {
    const c1 = render("CONSENT_C1", {
      playerName: "Luca Bianchi",
      confirmUrl: "https://hub.test/conferma-genitore/token",
      summary: "Promemoria",
    });
    const marketing = render("CONSENT_MARKETING_OPTIN", {
      confirmUrl: "https://hub.test/conferma-marketing/token",
    });
    expect(c1.subject).toMatch(/privacy/i);
    expect(c1.text).toContain("https://hub.test/conferma-genitore/token");
    expect(redactSecretVariables(c1.text, c1.variables)).not.toContain("https://hub.test/conferma-genitore/token");
    expect(marketing.text).toContain("https://hub.test/conferma-marketing/token");
  });

  it("non interpola variabili fuori allowlist", () => {
    expect(invalidTemplateVariables("Ciao {{fiscalCode}} {{nome}}")).toEqual(["fiscalCode"]);
    expect(interpolateTemplate("{{nome}} {{fiscalCode}}", { nome: "Anna" })).toBe("Anna ");
  });

  it("manda verifica email e richiesta al genitore senza allegati", () => {
    const verify = render("EMAIL_VERIFY", {
      confirmUrl: "https://hub.test/verifica-email/token",
      scadenza: "24h",
    });
    const guardian = render("GUARDIAN_AUTHORIZE", {
      playerName: "Luca Bianchi",
      teamName: "Mole Cup",
      confirmUrl: "https://hub.test/autorizzazione-genitore/token",
      scadenza: "2026-10-13 12:00",
      summary: "Atti di iscrizione",
    });
    expect(verify.text).toContain("https://hub.test/verifica-email/token");
    expect(guardian.text).toContain("Luca Bianchi");
    expect(guardian.text.toLowerCase()).not.toContain("allegat");
    expect(redactSecretVariables(guardian.text, guardian.variables)).not.toContain(
      "https://hub.test/autorizzazione-genitore/token",
    );
  });
});
