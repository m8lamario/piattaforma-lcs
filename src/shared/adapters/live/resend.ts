import { Resend } from "resend";
import { logger } from "@/shared/lib/logger";
import type { EmailAdapter, EmailMessage } from "../types";

function render(input: EmailMessage) {
  const title = input.variables.title ?? "Comunicazione ESL Player Hub";
  const redeemUrl = input.variables.redeemUrl;
  const resetUrl = input.variables.resetUrl;
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
  return {
    subject: title,
    text: title,
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
      const message = render(input);
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
