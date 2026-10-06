import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import type { WizardStepId } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import type { IconName } from "@/shared/ui/Icon";

export const WIZARD_STEP_LABELS: Record<WizardStepId, string> = {
  dati: it.stepDati,
  tutore: it.stepTutore,
  certificato: it.stepCertificato,
  privacy: it.stepPrivacy,
  liberatorie: it.stepLiberatorie,
  pagamento: it.stepPagamento,
  riepilogo: it.stepRiepilogo,
};

export const WIZARD_STEP_LEADS: Record<WizardStepId, string> = {
  dati: it.stepDatiLead,
  tutore: it.stepTutoreLead,
  certificato: it.stepCertificatoLead,
  privacy: it.stepPrivacyLead,
  liberatorie: it.stepLiberatorieLead,
  pagamento: it.stepPagamentoLead,
  riepilogo: it.stepRiepilogoLead,
};

export const WIZARD_STEP_TIPS: Record<WizardStepId, string> = {
  dati: it.stepDatiTip,
  tutore: it.stepTutoreTip,
  certificato: it.stepCertificatoTip,
  privacy: it.stepPrivacyTip,
  liberatorie: it.stepLiberatorieTip,
  pagamento: it.stepPagamentoTip,
  riepilogo: it.stepRiepilogoTip,
};

export const WIZARD_STEP_ICONS: Record<WizardStepId, IconName> = {
  dati: "user",
  tutore: "users",
  certificato: "medical",
  privacy: "privacy",
  liberatorie: "camera",
  pagamento: "payment",
  riepilogo: "summary",
};

export const REQUIREMENT_STEP: Record<ChecklistItem["code"], WizardStepId> = {
  PERSONAL_DATA: "dati",
  GUARDIAN_IF_MINOR: "tutore",
  MEDICAL_CERT: "certificato",
  PRIVACY: "privacy",
  MEDIA_RELEASE: "liberatorie",
  PAYMENT: "pagamento",
};

export function requirementLabel(code: ChecklistItem["code"]) {
  return WIZARD_STEP_LABELS[REQUIREMENT_STEP[code]];
}

export function requirementLead(code: ChecklistItem["code"]) {
  return WIZARD_STEP_LEADS[REQUIREMENT_STEP[code]];
}

export function requirementHref(code: ChecklistItem["code"]) {
  return `/area/registrazione/${REQUIREMENT_STEP[code]}`;
}
