import { describe, expect, it } from "vitest";
import { interpolateTemplate, invalidTemplateVariables, redactSecretVariables } from "./variables";
import { EMAIL_TEMPLATE_KEYS } from "./catalog";
import { defaultEmailTemplates, renderEmailContent } from "./templates";
import { EMAIL_LOGO_PATH } from "./theme";

const ORIGIN = "https://hub.test";

function render(key: keyof ReturnType<typeof defaultEmailTemplates>, variables: Record<string, string>) {
  return renderEmailContent({ template: defaultEmailTemplates()[key], variables, origin: ORIGIN });
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
    expect(message.html).toContain("placeholder-1");
    expect(message.html).toContain("https://hub.test/area");
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
    expect(approved.html).toContain("Apri l’area personale");
    expect(rejected.html).toContain("Apri l’area personale");
  });

  it("conferma l’iscrizione approvata con link all’area", () => {
    const message = render("REGISTRATION_APPROVED", {
      title: "Iscrizione approvata",
      areaUrl: "https://hub.test/area",
    });
    expect(message.subject).toBe("Iscrizione approvata");
    expect(message.text).toContain("https://hub.test/area");
    expect(message.html).toContain("https://hub.test/area");
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
    expect(c1.html).toContain("https://hub.test/conferma-genitore/token");
    expect(c1.html).toContain("Luca Bianchi");
    expect(marketing.html).toContain("https://hub.test/conferma-marketing/token");
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
    expect(verify.html).toContain("Conferma l’email");
    expect(guardian.html).toContain("Mole Cup");
    expect(guardian.html).toContain("Apri l’autorizzazione");
  });

  it("avvolge ogni template nel layout branded, con logo e fallback testuale", () => {
    const samples: Record<string, Record<string, string>> = {
      "player-invite": { redeemUrl: "https://hub.test/invito/token", teamName: "Alpha" },
      "staff-invite": { redeemUrl: "https://hub.test/invito-staff/token", teamName: "Alpha" },
      "password-reset": { resetUrl: "https://hub.test/recupera-password/token" },
      EMAIL_VERIFY: { confirmUrl: "https://hub.test/verifica-email/token", scadenza: "24h" },
      GUARDIAN_AUTHORIZE: {
        playerName: "Luca Bianchi",
        teamName: "Mole Cup",
        confirmUrl: "https://hub.test/autorizzazione-genitore/token",
        scadenza: "2026-10-13 12:00",
        summary: "Atti di iscrizione",
      },
      GUARDIAN_AUTHORIZED: {
        playerName: "Luca Bianchi",
        teamName: "Mole Cup",
        confirmUrl: "https://hub.test/revoca/token",
        summary: "Scelte registrate",
      },
      GUARDIAN_REFUSED: { playerName: "Luca Bianchi", summary: "Rifiuto" },
      MEDIA_REVOKE_INTERNAL: { playerName: "Luca Bianchi", summary: "Canale stampa" },
      REGISTRATION_RECEIVED: { documents: "Privacy: accettata", areaUrl: "https://hub.test/area" },
      REGISTRATION_APPROVED: { areaUrl: "https://hub.test/area" },
      DOCUMENT_APPROVED: { areaUrl: "https://hub.test/area" },
      DOCUMENT_REJECTED: { areaUrl: "https://hub.test/area" },
      CONSENT_C1: {
        playerName: "Luca Bianchi",
        confirmUrl: "https://hub.test/conferma-genitore/token",
        summary: "Promemoria",
      },
      CONSENT_MARKETING_OPTIN: { confirmUrl: "https://hub.test/conferma-marketing/token" },
      PAYMENT_SUCCEEDED: { areaUrl: "https://hub.test/area" },
      REGISTRATION_WITHDRAWN: { areaUrl: "https://hub.test/area" },
      REGISTRATION_REMINDER: { link: "https://hub.test/area" },
      LEGAL_VERSION_NOTICE: { link: "https://hub.test/area" },
      SCHOOL_ACCESS_APPROVED: {
        firstName: "Anna",
        schoolName: "Liceo Demo",
        activateUrl: "https://hub.test/attiva-account/token",
        scadenza: "21 ottobre 2026, 18:00",
      },
      SCHOOL_ACCESS_REJECTED: {
        firstName: "Anna",
        schoolName: "Liceo Demo",
        summary: "Dati da verificare con la segreteria.",
      },
      SCHOOL_ACCESS_INTERNAL: {
        schoolName: "Liceo Demo",
        summary: "Liceo Demo · Brescia",
        link: "https://hub.test/admin/richieste/abc",
      },
      MANUAL: { title: "Avviso", body: "Testo operativo", link: "https://hub.test/area" },
    };

    for (const key of EMAIL_TEMPLATE_KEYS) {
      const message = render(key, samples[key] ?? {});
      expect(message.html, key).toContain(EMAIL_LOGO_PATH);
      expect(message.html, key).toContain("LCS");
      expect(message.html, key).toContain("Player Hub");
      expect(message.html, key).toContain("/privacy");
      expect(message.html, key).not.toMatch(/width="1"/i);
      expect(message.html, key).not.toMatch(/height="1"/i);
      expect(message.text.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("escape il contenuto dinamico e applica il layout anche al testo personalizzato", () => {
    const xss = render("GUARDIAN_AUTHORIZE", {
      playerName: `<img src=x onerror="alert(1)">`,
      summary: "Atti <script>alert(1)</script>",
      confirmUrl: "https://hub.test/autorizzazione-genitore/token",
    });
    expect(xss.html).not.toContain("<script>alert(1)</script>");
    expect(xss.html).toContain("&lt;script&gt;");
    expect(xss.html).toContain("&lt;img");

    const custom = renderEmailContent({
      template: defaultEmailTemplates().MANUAL,
      variables: { title: "Avviso", body: "Corpo", link: "https://hub.test/area" },
      customText: "Messaggio libero\n\nhttps://hub.test/area",
      origin: ORIGIN,
    });
    expect(custom.html).toContain(EMAIL_LOGO_PATH);
    expect(custom.html).toContain("Messaggio libero");
    expect(custom.html).toContain("https://hub.test/area");
  });
});
