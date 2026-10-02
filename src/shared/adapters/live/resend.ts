import { Resend } from "resend";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";
import type { EmailAdapter, EmailMessage } from "../types";

export function renderEmailMessage(input: EmailMessage) {
  const title = input.variables.title ?? it.appName;
  const redeemUrl = input.variables.redeemUrl;
  const resetUrl = input.variables.resetUrl;
  const areaUrl = input.variables.areaUrl;
  const documents = input.variables.documents;
  if (input.template === "player-invite" && redeemUrl) {
    return {
      subject: "Invito in squadra",
      text: `Hai un invito. Apri questo link per creare o collegare l’account: ${redeemUrl}`,
    };
  }
  if (input.template === "staff-invite" && redeemUrl) {
    return {
      subject: "Invito rappresentante",
      text: `Hai un invito come rappresentante di squadra. Apri il link: ${redeemUrl}`,
    };
  }
  if (input.template === "password-reset" && resetUrl) {
    return {
      subject: "Reimposta la password",
      text: `Apri questo link per scegliere una nuova password: ${resetUrl}`,
    };
  }
  if (input.template === "REGISTRATION_RECEIVED") {
    return {
      subject: it.emailRegistrationReceivedSubject,
      text: [it.emailRegistrationReceivedIntro, documents, it.emailRegistrationReceivedOutro, areaUrl]
        .filter(Boolean)
        .join("\n\n"),
    };
  }
  if (input.template === "REGISTRATION_APPROVED") {
    return {
      subject: it.emailRegistrationApprovedSubject,
      text: [it.emailRegistrationApprovedText, areaUrl].filter(Boolean).join("\n\n"),
    };
  }
  if (input.template === "DOCUMENT_APPROVED") {
    return {
      subject: it.emailDocumentApprovedSubject,
      text: [it.emailDocumentApprovedText, areaUrl].filter(Boolean).join("\n\n"),
    };
  }
  if (input.template === "DOCUMENT_REJECTED") {
    return {
      subject: it.emailDocumentRejectedSubject,
      text: [it.emailDocumentRejectedText, areaUrl].filter(Boolean).join("\n\n"),
    };
  }
  if (input.template === "CONSENT_C1") {
    return {
      subject: it.emailC1Subject,
      text: [it.confirmC1Help, input.variables.playerName, input.variables.summary, input.variables.confirmUrl]
        .filter(Boolean)
        .join("\n\n"),
    };
  }
  if (input.template === "CONSENT_MARKETING_OPTIN") {
    return {
      subject: it.emailMarketingOptInSubject,
      text: [it.confirmMarketingHelp, input.variables.confirmUrl].filter(Boolean).join("\n\n"),
    };
  }
  return {
    subject: title,
    text: areaUrl ? `${title}\n\n${areaUrl}` : title,
  };
}

export function createResendEmailAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Resend non configurato");
  }
  const client = new Resend(apiKey);
  return {
    async send(input) {
      const message = renderEmailMessage(input);
      const result = await client.emails.send({
        from,
        to: input.to,
        subject: message.subject,
        text: message.text,
      });
      if (result.error) {
        logger.error("email.resend.failed", { template: input.template });
        throw new Error("Invio email non riuscito");
      }
    },
  };
}
