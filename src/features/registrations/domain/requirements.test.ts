import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITION_REQUIREMENTS,
  projectChecklist,
  projectRegistrationStatus,
  type EditionRequirement,
  type RegistrationEvidence,
} from "./requirements";

const defaultRequirements: EditionRequirement[] = DEFAULT_EDITION_REQUIREMENTS;

function evidence(overrides: Partial<RegistrationEvidence> = {}): RegistrationEvidence {
  return {
    hasAccount: true,
    hasPersonalData: true,
    isMinor: false,
    hasGuardian: false,
    medicalStatus: "approved",
    privacyAccepted: true,
    mediaDecision: "none",
    payment: {
      mode: "PLAYER",
      playerSucceeded: false,
      teamSucceeded: false,
    },
    ...overrides,
  };
}

describe("projectChecklist", () => {
  it("richiede il tutore solo se il giocatore è minore", () => {
    const adult = projectChecklist(defaultRequirements, evidence({ isMinor: false }));
    const minor = projectChecklist(
      defaultRequirements,
      evidence({ isMinor: true, hasGuardian: false }),
    );
    expect(adult.find((item) => item.code === "GUARDIAN_IF_MINOR")?.status).toBe(
      "not_applicable",
    );
    expect(minor.find((item) => item.code === "GUARDIAN_IF_MINOR")?.status).toBe("todo");
  });

  it("non blocca l'iscrizione se la liberatoria media è opzionale e non accettata", () => {
    const data = evidence({
      medicalStatus: "approved",
      payment: { mode: "PLAYER", playerSucceeded: true, teamSucceeded: false },
      mediaDecision: "none",
    });
    const checklist = projectChecklist(defaultRequirements, data);
    const media = checklist.find((item) => item.code === "MEDIA_RELEASE");
    expect(media?.required).toBe(false);
    expect(media?.status).toBe("todo");
    expect(projectRegistrationStatus(data, checklist)).toBe("APPROVED");
  });

  it("completa la liberatoria opzionale se il giocatore rifiuta in modo esplicito", () => {
    const data = evidence({
      payment: { mode: "PLAYER", playerSucceeded: true, teamSucceeded: false },
      mediaDecision: "refused",
    });
    const checklist = projectChecklist(defaultRequirements, data);
    expect(checklist.find((item) => item.code === "MEDIA_RELEASE")?.status).toBe("complete");
  });

  it("segna il certificato in attenzione se è in revisione o rifiutato", () => {
    const pending = projectChecklist(defaultRequirements, evidence({ medicalStatus: "pending" }));
    const rejected = projectChecklist(defaultRequirements, evidence({ medicalStatus: "rejected" }));
    expect(pending.find((item) => item.code === "MEDICAL_CERT")?.status).toBe("attention");
    expect(rejected.find((item) => item.code === "MEDICAL_CERT")?.status).toBe("attention");
    expect(projectRegistrationStatus(evidence({ medicalStatus: "rejected" }), rejected)).toBe(
      "CHANGES_REQUESTED",
    );
  });

  it("considera coperto il pagamento giocatore se la squadra ha già pagato", () => {
    const data = evidence({
      payment: { mode: "BOTH", playerSucceeded: false, teamSucceeded: true },
    });
    const checklist = projectChecklist(defaultRequirements, data);
    expect(checklist.find((item) => item.code === "PAYMENT")?.status).toBe("complete");
    expect(projectRegistrationStatus(data, checklist)).toBe("APPROVED");
  });
});
