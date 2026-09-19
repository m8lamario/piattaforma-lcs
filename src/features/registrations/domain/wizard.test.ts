import { describe, expect, it } from "vitest";
import { DEFAULT_EDITION_REQUIREMENTS, projectChecklist, type RegistrationEvidence } from "./requirements";
import { gateWizardStep, nextHero, nextIncompleteStep, nextStepAfter, visibleWizardSteps } from "./wizard";

function evidence(overrides: Partial<RegistrationEvidence> = {}): RegistrationEvidence {
  return {
    hasAccount: true,
    hasPersonalData: false,
    isMinor: false,
    hasGuardian: false,
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
