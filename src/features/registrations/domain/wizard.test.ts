import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITION_REQUIREMENTS,
  projectChecklist,
  projectRegistrationStatus,
  type RegistrationEvidence,
} from "./requirements";
import { gateWizardStep, nextHero, nextIncompleteAfter, nextIncompleteStep, nextStepAfter, visibleWizardSteps } from "./wizard";

function evidence(overrides: Partial<RegistrationEvidence> = {}): RegistrationEvidence {
  return {
    category: "PLAYER",
    hasAccount: true,
    hasPersonalData: false,
    isMinor: false,
    hasGuardian: false,
    hasGuardianContact: false,
    guardianAuthorization: "none",
    medicalStatus: "none",
    privacyAccepted: false,
    mediaDecision: "none",
    payment: { mode: "PLAYER", playerSucceeded: false, teamSucceeded: false },
    ...overrides,
  };
}

describe("wizard", () => {
  it("nasconde il tutore se il giocatore è maggiorenne", () => {
    const adult = projectChecklist(DEFAULT_EDITION_REQUIREMENTS, evidence({ hasPersonalData: true }));
    expect(visibleWizardSteps(adult)).not.toContain("tutore");
    expect(nextIncompleteStep(adult)).toBe("certificato");
  });

  it("inserisce il tutore dopo i dati se minore", () => {
    const minor = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ hasPersonalData: true, isMinor: true }),
    );
    expect(visibleWizardSteps(minor)).toContain("tutore");
    expect(nextIncompleteStep(minor)).toBe("tutore");
  });

  it("non fa saltare i dati personali per aprire un passo successivo", () => {
    const checklist = projectChecklist(DEFAULT_EDITION_REQUIREMENTS, evidence());
    expect(gateWizardStep("certificato", checklist)).toBe("dati");
    expect(gateWizardStep("tutore", checklist)).toBe("dati");
  });

  it("un giocatore già iscritto senza taglia resta bloccato sul passo dati", () => {
    const checklist = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({
        hasPersonalData: false,
        medicalStatus: "approved",
        privacyAccepted: true,
        mediaDecision: "submitted",
        payment: { mode: "PLAYER", playerSucceeded: true, teamSucceeded: false },
      }),
    );
    expect(gateWizardStep("riepilogo", checklist)).toBe("dati");
    expect(gateWizardStep("pagamento", checklist)).toBe("dati");
    expect(nextHero(checklist).code).toBe("PERSONAL_DATA");
  });

  it("dopo i dati consente di aprire privacy anche se il certificato è ancora da fare", () => {
    const checklist = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ hasPersonalData: true }),
    );
    expect(gateWizardStep("privacy", checklist)).toBe("privacy");
    expect(gateWizardStep("pagamento", checklist)).toBe("pagamento");
  });

  it("completa più tardi salta il certificato e va al passo successivo incompleto", () => {
    const checklist = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ hasPersonalData: true }),
    );
    expect(nextIncompleteAfter("certificato", checklist)).toBe("privacy");
  });

  it("per lo staff salta il certificato e continua con privacy e pagamento", () => {
    const checklist = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ category: "STAFF", hasPersonalData: true }),
    );
    expect(visibleWizardSteps(checklist)).not.toContain("certificato");
    expect(nextStepAfter("dati", checklist)).toBe("privacy");
    expect(nextHero(checklist).code).not.toBe("MEDICAL_CERT");
    expect(gateWizardStep("certificato", checklist)).not.toBe("certificato");
  });

  it("dopo i dati di un adulto va al certificato", () => {
    const checklist = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ hasPersonalData: true }),
    );
    expect(nextStepAfter("dati", checklist)).toBe("certificato");
    expect(nextHero(checklist)).toEqual({
      code: "MEDICAL_CERT",
      implemented: true,
      status: "todo",
    });
  });

  it("mette in evidenza un certificato in revisione o rifiutato", () => {
    const pending = projectChecklist(
      DEFAULT_EDITION_REQUIREMENTS,
      evidence({ hasPersonalData: true, medicalStatus: "pending" }),
    );
    expect(nextHero(pending)).toEqual({
      code: "MEDICAL_CERT",
      implemented: true,
      status: "attention",
    });
    expect(gateWizardStep("privacy", pending)).toBe("privacy");
    expect(nextIncompleteStep(pending)).toBe("privacy");
  });
});

describe("matrice prossimo passo giocatore", () => {
  it.each([
    {
      name: "adulto senza dati",
      data: {},
      hero: { code: "PERSONAL_DATA" as const, status: "todo" as const },
    },
    {
      name: "adulto con i dati",
      data: { hasPersonalData: true },
      hero: { code: "MEDICAL_CERT" as const, status: "todo" as const },
    },
    {
      name: "certificato scaduto con tutore già completo",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardian: true,
        hasGuardianContact: true,
        guardianAuthorization: "authorized" as const,
        medicalStatus: "expired" as const,
        privacyAccepted: true,
        mediaDecision: "submitted" as const,
        payment: { mode: "PLAYER" as const, playerSucceeded: true, teamSucceeded: false },
      },
      hero: { code: "MEDICAL_CERT" as const, status: "attention" as const },
    },
    {
      name: "certificato rifiutato con tutore già completo",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardian: true,
        hasGuardianContact: true,
        guardianAuthorization: "authorized" as const,
        medicalStatus: "rejected" as const,
      },
      hero: { code: "MEDICAL_CERT" as const, status: "attention" as const },
    },
    {
      name: "certificato in revisione con tutore già completo",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardian: true,
        hasGuardianContact: true,
        guardianAuthorization: "authorized" as const,
        medicalStatus: "pending" as const,
      },
      hero: { code: "MEDICAL_CERT" as const, status: "attention" as const },
    },
    {
      name: "minore con tutore in attesa, certificato ancora da fare",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardianContact: true,
        guardianAuthorization: "pending" as const,
        medicalStatus: "none" as const,
      },
      hero: { code: "GUARDIAN_IF_MINOR" as const, status: "attention" as const },
    },
    {
      name: "minore con tutore rifiutato, certificato ancora da fare",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardianContact: true,
        guardianAuthorization: "refused" as const,
        medicalStatus: "none" as const,
      },
      hero: { code: "GUARDIAN_IF_MINOR" as const, status: "attention" as const },
    },
    {
      name: "staff dopo i dati: niente certificato, si va alla privacy",
      data: { category: "STAFF" as const, hasPersonalData: true },
      hero: { code: "PRIVACY" as const, status: "todo" as const },
    },
    {
      name: "liberatorie e pagamento aperti, certificato solo caricato",
      data: {
        hasPersonalData: true,
        medicalStatus: "pending" as const,
        privacyAccepted: true,
        mediaDecision: "none" as const,
        payment: { mode: "PLAYER" as const, playerSucceeded: false, teamSucceeded: false },
      },
      hero: { code: "MEDICAL_CERT" as const, status: "attention" as const },
    },
    {
      name: "iscrizione approvata con certificato ancora da caricare",
      data: {
        hasPersonalData: true,
        medicalStatus: "none" as const,
        privacyAccepted: true,
        mediaDecision: "submitted" as const,
        payment: { mode: "PLAYER" as const, playerSucceeded: true, teamSucceeded: false },
      },
      hero: { code: "MEDICAL_CERT" as const, status: "todo" as const },
      registrationStatus: "APPROVED" as const,
    },
    {
      name: "attesa dell’altro genitore: l’eroe resta il certificato",
      data: {
        hasPersonalData: true,
        isMinor: true,
        hasGuardian: true,
        hasGuardianContact: true,
        guardianAuthorization: "authorized" as const,
        medicalStatus: "none" as const,
        privacyAccepted: true,
        mediaDecision: "submitted" as const,
        payment: { mode: "PLAYER" as const, playerSucceeded: true, teamSucceeded: false },
      },
      hero: { code: "MEDICAL_CERT" as const, status: "todo" as const },
    },
  ])("$name", ({ data, hero, registrationStatus }) => {
    const ev = evidence(data);
    const checklist = projectChecklist(DEFAULT_EDITION_REQUIREMENTS, ev);
    expect(nextHero(checklist)).toMatchObject(hero);
    expect(nextHero(checklist).code).not.toBe("DONE");
    if (registrationStatus) {
      expect(projectRegistrationStatus(ev, checklist)).toBe(registrationStatus);
    }
  });
});
