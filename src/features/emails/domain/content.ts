import { it } from "@/shared/i18n/it";
import { isEmailTemplateKey, type EmailTemplateKey } from "./catalog";
import { detailsHtml, infoBoxHtml, paragraphsHtml } from "./html";
import { wrapEmailLayout } from "./layout";
import { interpolateTemplate } from "./variables";
import type { EmailTone } from "./theme";

export type EmailCtaUrlKey = "link" | "confirmUrl" | "resetUrl" | "redeemUrl" | "areaUrl";

export type EmailVisualSpec = {
  heading: string;
  preheader: string;
  intro: string;
  details: { label: string; value: string }[];
  boxTitle?: string;
  boxBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tone: EmailTone;
};

type SpecContext = {
  vars: Record<string, string>;
  subject: string;
};

function t(source: string, vars: Record<string, string>) {
  return interpolateTemplate(source, vars).trim();
}

function url(vars: Record<string, string>, key: EmailCtaUrlKey) {
  return vars[key] || vars.link || "";
}

function detail(label: string, value: string | undefined) {
  return value?.trim() ? { label, value: value.trim() } : null;
}

const SPECS: Record<EmailTemplateKey, (ctx: SpecContext) => EmailVisualSpec> = {
  "player-invite": ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailPlayerInvitePreheader,
    intro: t(it.emailPlayerInviteIntro, vars),
    details: [detail(it.emailLabelTeam, vars.nome_squadra || vars.teamName)].filter(Boolean) as EmailVisualSpec["details"],
    ctaLabel: it.emailCtaOpenInvite,
    ctaUrl: url(vars, "redeemUrl"),
    tone: "neutral",
  }),
  "staff-invite": ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailStaffInvitePreheader,
    intro: t(it.emailStaffInviteIntro, vars),
    details: [detail(it.emailLabelTeam, vars.nome_squadra || vars.teamName)].filter(Boolean) as EmailVisualSpec["details"],
    ctaLabel: it.emailCtaStaffInvite,
    ctaUrl: url(vars, "redeemUrl"),
    tone: "neutral",
  }),
  "password-reset": ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailPasswordResetPreheader,
    intro: t(it.emailPasswordResetIntro, vars),
    details: [],
    ctaLabel: it.emailCtaResetPassword,
    ctaUrl: url(vars, "resetUrl"),
    tone: "neutral",
  }),
  EMAIL_VERIFY: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailVerifyPreheader,
    intro: t(it.emailVerifyIntro, vars),
    details: [detail(it.emailLabelExpiry, vars.scadenza)].filter(Boolean) as EmailVisualSpec["details"],
    ctaLabel: it.emailCtaConfirmEmail,
    ctaUrl: url(vars, "confirmUrl"),
    tone: "neutral",
  }),
  GUARDIAN_AUTHORIZE: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailGuardianAuthorizePreheader,
    intro: t(it.emailGuardianAuthorizeIntro, vars),
    details: [
      detail(it.emailLabelPlayer, vars.playerName),
      detail(it.emailLabelTournament, vars.teamName || vars.nome_squadra),
      detail(it.emailLabelExpiry, vars.scadenza),
    ].filter(Boolean) as EmailVisualSpec["details"],
    ctaLabel: it.emailCtaAuthorize,
    ctaUrl: url(vars, "confirmUrl"),
    tone: "neutral",
  }),
  GUARDIAN_AUTHORIZED: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailGuardianAuthorizedPreheader,
    intro: t(it.emailGuardianAuthorizedIntro, vars),
    details: [
      detail(it.emailLabelPlayer, vars.playerName),
      detail(it.emailLabelTournament, vars.teamName || vars.nome_squadra),
    ].filter(Boolean) as EmailVisualSpec["details"],
    ctaLabel: it.emailCtaRevokeOptional,
    ctaUrl: url(vars, "confirmUrl"),
    tone: "success",
  }),
  GUARDIAN_REFUSED: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailGuardianRefusedPreheader,
    intro: t(it.emailGuardianRefusedIntro, vars),
    details: [detail(it.emailLabelPlayer, vars.playerName)].filter(Boolean) as EmailVisualSpec["details"],
    tone: "danger",
  }),
  MEDIA_REVOKE_INTERNAL: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailMediaRevokePreheader,
    intro: t(it.emailMediaRevokeIntro, vars),
    details: [detail(it.emailLabelPlayer, vars.playerName)].filter(Boolean) as EmailVisualSpec["details"],
    boxBody: vars.summary,
    tone: "warning",
  }),
  REGISTRATION_RECEIVED: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailRegistrationReceivedPreheader,
    intro: t(it.emailRegistrationReceivedIntro, vars),
    details: [],
    boxTitle: it.emailLabelDocuments,
    boxBody: vars.documents,
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "success",
  }),
  REGISTRATION_APPROVED: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailRegistrationApprovedPreheader,
    intro: t(it.emailRegistrationApprovedIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "success",
  }),
  DOCUMENT_APPROVED: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailDocumentApprovedPreheader,
    intro: t(it.emailDocumentApprovedIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "success",
  }),
  DOCUMENT_REJECTED: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailDocumentRejectedPreheader,
    intro: t(it.emailDocumentRejectedIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "warning",
  }),
  CONSENT_C1: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailC1Preheader,
    intro: t(it.confirmC1Help, vars),
    details: [detail(it.emailLabelPlayer, vars.playerName)].filter(Boolean) as EmailVisualSpec["details"],
    boxBody: vars.summary,
    ctaLabel: it.emailCtaConfirmC1,
    ctaUrl: url(vars, "confirmUrl"),
    tone: "neutral",
  }),
  CONSENT_MARKETING_OPTIN: ({ vars, subject }) => ({
    heading: subject,
    preheader: it.emailMarketingPreheader,
    intro: t(it.emailMarketingIntro, vars),
    details: [],
    ctaLabel: it.emailCtaConfirmMarketing,
    ctaUrl: url(vars, "confirmUrl"),
    tone: "neutral",
  }),
  PAYMENT_SUCCEEDED: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailPaymentPreheader,
    intro: t(it.emailPaymentIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "success",
  }),
  REGISTRATION_WITHDRAWN: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailWithdrawnPreheader,
    intro: t(it.emailWithdrawnIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "areaUrl"),
    tone: "warning",
  }),
  REGISTRATION_REMINDER: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailReminderPreheader,
    intro: t(it.emailReminderIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "link"),
    tone: "warning",
  }),
  LEGAL_VERSION_NOTICE: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailLegalVersionPreheader,
    intro: t(it.emailLegalVersionIntro, vars),
    details: [],
    ctaLabel: it.emailCtaOpenArea,
    ctaUrl: url(vars, "link"),
    tone: "neutral",
  }),
  MANUAL: ({ vars, subject }) => ({
    heading: vars.title || subject,
    preheader: it.emailManualPreheader,
    intro: vars.body || "",
    details: [],
    ctaLabel: vars.link ? it.emailCtaOpenLink : undefined,
    ctaUrl: vars.link,
    tone: "neutral",
  }),
};

export function emailVisualSpec(input: {
  key: string;
  subject: string;
  variables: Record<string, string>;
}): EmailVisualSpec {
  const key: EmailTemplateKey = isEmailTemplateKey(input.key) ? input.key : "MANUAL";
  return SPECS[key]({ vars: input.variables, subject: input.subject });
}

export function buildEmailHtml(input: {
  key: string;
  subject: string;
  text: string;
  variables: Record<string, string>;
  origin: string;
  customized?: boolean;
}) {
  const spec = emailVisualSpec({
    key: input.key,
    subject: input.subject,
    variables: input.variables,
  });
  const ctaUrl = spec.ctaUrl?.trim() || "";
  const intro = input.customized ? input.text : spec.intro;
  const skip = ctaUrl ? [ctaUrl] : [];
  const bodyHtml = input.customized
    ? paragraphsHtml(intro, skip)
    : `${paragraphsHtml(intro, skip)}${detailsHtml(spec.details)}${infoBoxHtml(spec.boxTitle, spec.boxBody ?? "")}`;

  return wrapEmailLayout({
    origin: input.origin,
    subject: input.subject,
    preheader: spec.preheader,
    heading: spec.heading,
    tone: spec.tone,
    bodyHtml,
    cta: spec.ctaLabel && ctaUrl ? { label: spec.ctaLabel, url: ctaUrl } : undefined,
  });
}
