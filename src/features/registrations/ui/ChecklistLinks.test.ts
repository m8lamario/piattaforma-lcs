import { describe, expect, it } from "vitest";
import { DEFAULT_EDITION_REQUIREMENTS, projectChecklist, type RegistrationEvidence } from "@/features/registrations/domain/requirements";
import { nextHero } from "@/features/registrations/domain/wizard";
import { dashboardChecklistTone } from "./dashboardChecklist";

describe("dashboardChecklistTone", () => {
  it("marca arancio il passo tutore se manca l’altro genitore", () => {
    expect(dashboardChecklistTone({ code: "GUARDIAN_IF_MINOR", status: "complete" }, true)).toBe("attention");
  });

  it("non cambia gli altri passi durante l’attesa", () => {
    expect(dashboardChecklistTone({ code: "MEDICAL_CERT", status: "complete" }, true)).toBe("complete");
    expect(dashboardChecklistTone({ code: "MEDICAL_CERT", status: "attention" }, true)).toBe("attention");
  });

  it("lascia il tutore completo se non c’è attesa", () => {
    expect(dashboardChecklistTone({ code: "GUARDIAN_IF_MINOR", status: "complete" }, false)).toBe("complete");
  });

  it("l’attesa dell’altro genitore non cambia l’eroe né il conteggio completati", () => {
    const evidence: RegistrationEvidence = {
      category: "PLAYER",
      hasAccount: true,
      hasPersonalData: true,
      isMinor: true,
      hasGuardian: true,
      hasGuardianContact: true,
      guardianAuthorization: "authorized",
      medicalStatus: "expired",
      privacyAccepted: true,
      mediaDecision: "submitted",
      payment: { mode: "PLAYER", playerSucceeded: true, teamSucceeded: false },
    };
    const checklist = projectChecklist(DEFAULT_EDITION_REQUIREMENTS, evidence);
    const guardian = checklist.find((item) => item.code === "GUARDIAN_IF_MINOR");
    const medical = checklist.find((item) => item.code === "MEDICAL_CERT");
    expect(guardian?.status).toBe("complete");
    expect(medical?.status).toBe("attention");
    expect(nextHero(checklist).code).toBe("MEDICAL_CERT");
    expect(dashboardChecklistTone(guardian!, true)).toBe("attention");
    expect(dashboardChecklistTone(medical!, true)).toBe("attention");
    const visible = checklist.filter((item) => item.status !== "not_applicable");
    const done = visible.filter((item) => item.status === "complete");
    expect(done.some((item) => item.code === "GUARDIAN_IF_MINOR")).toBe(true);
  });
});
