import { describe, expect, it } from "vitest";
import {
  approvalReasonCode,
  healthConsentLabels,
  medicalDeadlineNotifyBody,
  parseMedicalCertificateKind,
} from "./medicalRequirement";

describe("requisito medico per edizione", () => {
  it("default agonistico se il valore manca", () => {
    expect(parseMedicalCertificateKind(undefined)).toBe("COMPETITIVE");
    expect(parseMedicalCertificateKind("NOPE")).toBe("COMPETITIVE");
    expect(parseMedicalCertificateKind("NON_COMPETITIVE")).toBe("NON_COMPETITIVE");
  });

  it("il motivo di approvazione segue il kind corrente", () => {
    expect(approvalReasonCode("COMPETITIVE")).toBe("AGONISTIC_FOOTBALL_CERTIFICATE");
    expect(approvalReasonCode("NON_COMPETITIVE")).toBe("NON_COMPETITIVE_SPORT_CERTIFICATE");
  });

  it("le caselle non agonistiche sono placeholder e non riscrivono M3/G4 agonistici", () => {
    expect(healthConsentLabels("COMPETITIVE")).toEqual({});
    const labels = healthConsentLabels("NON_COMPETITIVE");
    expect(labels.M3).toContain("[INSERIRE CLAUSOLA M3 PER CERTIFICATO NON AGONISTICO]");
    expect(labels.G4).toContain("[INSERIRE CLAUSOLA G4 PER CERTIFICATO NON AGONISTICO]");
  });

  it("il promemoria distingue agonistico e non agonistico senza dati sanitari", () => {
    expect(medicalDeadlineNotifyBody("COMPETITIVE").toLowerCase()).toContain("agonistic");
    expect(medicalDeadlineNotifyBody("NON_COMPETITIVE").toLowerCase()).toContain("non agonistic");
    expect(medicalDeadlineNotifyBody("COMPETITIVE").toLowerCase()).not.toContain("diagnosi");
  });
});
