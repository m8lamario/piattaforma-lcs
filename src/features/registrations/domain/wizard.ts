import type { ChecklistItem, RequirementCode } from "./requirements";

export const WIZARD_STEP_IDS = [
  "dati",
  "tutore",
  "certificato",
  "privacy",
  "liberatorie",
  "pagamento",
  "riepilogo",
] as const;

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

type StepDefinition = {
  id: WizardStepId;
  code: RequirementCode | null;
  implemented: boolean;
};

export const WIZARD_STEPS: StepDefinition[] = [
  { id: "dati", code: "PERSONAL_DATA", implemented: true },
  { id: "tutore", code: "GUARDIAN_IF_MINOR", implemented: true },
  { id: "certificato", code: "MEDICAL_CERT", implemented: true },
  { id: "privacy", code: "PRIVACY", implemented: true },
  { id: "liberatorie", code: "MEDIA_RELEASE", implemented: true },
  { id: "pagamento", code: "PAYMENT", implemented: true },
  { id: "riepilogo", code: null, implemented: true },
];

export function isWizardStepId(value: string): value is WizardStepId {
  return WIZARD_STEPS.some((step) => step.id === value);
}

export function stepDefinition(id: WizardStepId) {
  return WIZARD_STEPS.find((step) => step.id === id) ?? WIZARD_STEPS[0];
}

export function visibleWizardSteps(checklist: ChecklistItem[]): WizardStepId[] {
  return WIZARD_STEPS.filter((step) => {
    if (!step.code) return true;
    const item = checklist.find((entry) => entry.code === step.code);
    if (!item) return step.id === "dati";
    return item.status !== "not_applicable";
  }).map((step) => step.id);
}

function itemForStep(step: StepDefinition, checklist: ChecklistItem[]) {
  if (!step.code) return null;
  return checklist.find((entry) => entry.code === step.code) ?? null;
}

export function isStepIncomplete(id: WizardStepId, checklist: ChecklistItem[]) {
  const step = stepDefinition(id);
  const item = itemForStep(step, checklist);
  if (!item) return id !== "riepilogo";
  return item.status === "todo" || item.status === "attention";
}

function isStepTodo(id: WizardStepId, checklist: ChecklistItem[]) {
  const step = stepDefinition(id);
  const item = itemForStep(step, checklist);
  if (!item) return id !== "riepilogo";
  return item.status === "todo";
}

export function nextIncompleteStep(checklist: ChecklistItem[]): WizardStepId {
  const visible = visibleWizardSteps(checklist);
  const implementedGap = visible.find((id) => {
    const step = stepDefinition(id);
    return step.implemented && isStepTodo(id, checklist);
  });
  if (implementedGap) return implementedGap;
  const upcoming = visible.find((id) => isStepIncomplete(id, checklist));
  return upcoming ?? "riepilogo";
}

export function gateWizardStep(requested: WizardStepId, checklist: ChecklistItem[]): WizardStepId {
  const visible = visibleWizardSteps(checklist);
  if (!visible.includes(requested)) {
    return nextIncompleteStep(checklist);
  }

  const requestedIndex = visible.indexOf(requested);
  const firstBlockingImplemented = visible.find((id, index) => {
    const step = stepDefinition(id);
    return index < requestedIndex && step.implemented && isStepTodo(id, checklist);
  });
  return firstBlockingImplemented ?? requested;
}

export function nextStepAfter(current: WizardStepId, checklist: ChecklistItem[]): WizardStepId | "area" {
  const visible = visibleWizardSteps(checklist);
  const index = visible.indexOf(current);
  const following = visible[index + 1];
  return following ?? "area";
}

export type NextHero = {
  code: RequirementCode | "DONE";
  implemented: boolean;
  status: ChecklistItem["status"] | "complete";
};

export function nextHero(checklist: ChecklistItem[]): NextHero {
  const attention = checklist.find((item) => item.status === "attention");
  if (attention) {
    const step = WIZARD_STEPS.find((entry) => entry.code === attention.code);
    return { code: attention.code, implemented: step?.implemented ?? false, status: "attention" };
  }
  const requiredTodo = checklist.find((item) => item.required && item.status === "todo");
  if (requiredTodo) {
    const step = WIZARD_STEPS.find((entry) => entry.code === requiredTodo.code);
    return { code: requiredTodo.code, implemented: step?.implemented ?? false, status: "todo" };
  }
  const optionalTodo = checklist.find((item) => item.status === "todo");
  if (optionalTodo) {
    const step = WIZARD_STEPS.find((entry) => entry.code === optionalTodo.code);
    return { code: optionalTodo.code, implemented: step?.implemented ?? false, status: "todo" };
  }
  return { code: "DONE", implemented: true, status: "complete" };
}
