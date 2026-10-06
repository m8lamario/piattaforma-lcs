import { it } from "@/shared/i18n/it";
import { EMAIL_TEMPLATE_KEYS, isEmailTemplateKey, type EmailTemplateKey } from "./catalog";
import { interpolateTemplate, pickEmailVariables } from "./variables";

export type EmailTemplateSource = {
  key: string;
  subject: string;
  textBody: string;
};

function collapse(text: string) {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function defaultEmailTemplates(): Record<EmailTemplateKey, EmailTemplateSource> {
  return {
    "player-invite": { key: "player-invite", subject: it.emailPlayerInviteSubject, textBody: it.emailPlayerInviteText },
    "staff-invite": { key: "staff-invite", subject: it.emailStaffInviteSubject, textBody: it.emailStaffInviteText },
    "password-reset": {
      key: "password-reset",
      subject: it.emailPasswordResetSubject,
      textBody: it.emailPasswordResetText,
    },
    EMAIL_VERIFY: {
      key: "EMAIL_VERIFY",
      subject: it.emailVerifySubject,
      textBody: it.emailVerifyText,
    },
    GUARDIAN_AUTHORIZE: {
      key: "GUARDIAN_AUTHORIZE",
      subject: it.emailGuardianAuthorizeSubject,
      textBody: it.emailGuardianAuthorizeText,
    },
    GUARDIAN_AUTHORIZED: {
      key: "GUARDIAN_AUTHORIZED",
      subject: it.emailGuardianAuthorizedSubject,
      textBody: it.emailGuardianAuthorizedText,
    },
    GUARDIAN_REFUSED: {
      key: "GUARDIAN_REFUSED",
      subject: it.emailGuardianRefusedSubject,
      textBody: it.emailGuardianRefusedText,
    },
    MEDIA_REVOKE_INTERNAL: {
      key: "MEDIA_REVOKE_INTERNAL",
      subject: it.emailMediaRevokeSubject,
      textBody: it.emailMediaRevokeText,
    },
    REGISTRATION_RECEIVED: {
      key: "REGISTRATION_RECEIVED",
      subject: it.emailRegistrationReceivedSubject,
      textBody: `${it.emailRegistrationReceivedIntro}\n\n{{documents}}\n\n${it.emailRegistrationReceivedOutro}\n\n{{link}}`,
    },
    REGISTRATION_APPROVED: {
      key: "REGISTRATION_APPROVED",
      subject: it.emailRegistrationApprovedSubject,
      textBody: `${it.emailRegistrationApprovedText}\n\n{{link}}`,
    },
    DOCUMENT_APPROVED: {
      key: "DOCUMENT_APPROVED",
      subject: it.emailDocumentApprovedSubject,
      textBody: `${it.emailDocumentApprovedText}\n\n{{link}}`,
    },
    DOCUMENT_REJECTED: {
      key: "DOCUMENT_REJECTED",
      subject: it.emailDocumentRejectedSubject,
      textBody: `${it.emailDocumentRejectedText}\n\n{{link}}`,
    },
    CONSENT_C1: {
      key: "CONSENT_C1",
      subject: it.emailC1Subject,
      textBody: `${it.confirmC1Help}\n\n{{playerName}}\n\n{{summary}}\n\n{{link}}`,
    },
    CONSENT_MARKETING_OPTIN: {
      key: "CONSENT_MARKETING_OPTIN",
      subject: it.emailMarketingOptInSubject,
      textBody: `${it.confirmMarketingHelp}\n\n{{link}}`,
    },
    REGISTRATION_REMINDER: {
      key: "REGISTRATION_REMINDER",
      subject: it.emailReminderSubject,
      textBody: it.emailReminderText,
    },
    PAYMENT_SUCCEEDED: {
      key: "PAYMENT_SUCCEEDED",
      subject: it.emailPaymentSucceededSubject,
      textBody: it.emailPaymentSucceededText,
    },
    REGISTRATION_WITHDRAWN: {
      key: "REGISTRATION_WITHDRAWN",
      subject: it.emailWithdrawnSubject,
      textBody: it.emailWithdrawnText,
    },
    LEGAL_VERSION_NOTICE: {
      key: "LEGAL_VERSION_NOTICE",
      subject: it.emailLegalVersionSubject,
      textBody: it.emailLegalVersionText,
    },
    MANUAL: {
      key: "MANUAL",
      subject: it.emailManualSubject,
      textBody: it.emailManualText,
    },
  };
}

export function templateSource(key: string): EmailTemplateSource {
  const defaults = defaultEmailTemplates();
  if (isEmailTemplateKey(key)) return defaults[key];
  return defaults.MANUAL;
}

export function renderEmailContent(input: {
  template: EmailTemplateSource;
  variables: Record<string, string>;
  customSubject?: string;
  customText?: string;
}) {
  const subjectSource = input.customSubject?.trim() || input.template.subject;
  const bodySource = input.customText?.trim() || input.template.textBody;
  const variables = pickEmailVariables(input.variables);
  return {
    subject: collapse(interpolateTemplate(subjectSource, variables)),
    text: collapse(interpolateTemplate(bodySource, variables)),
    variables,
  };
}

export { EMAIL_TEMPLATE_KEYS, isEmailTemplateKey };
export type { EmailTemplateKey };
