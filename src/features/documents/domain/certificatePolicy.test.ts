import { describe, expect, it } from "vitest";
import {
  detectCertificateKind,
  GENERIC_CERTIFICATE_HINTS,
  inspectCertificateText,
  proposedCertificateExpiry,
  realignInspectionAnomalies,
  statusFromAnomalies,
} from "./certificatePolicy";
import { realignOpenDocument } from "./inspection";
import { approvalReasonCode } from "./medicalRequirement";

const NOW = new Date("2026-10-15T12:00:00.000Z");

function competitiveText(name = "Mario Rossi") {
  return [
    `Si certifica che ${name} è idoneo alla pratica sportiva agonistica per il calcio.`,
    "Data di rilascio 01/09/2026.",
    "Scadenza 01/09/2027.",
    "Firma e timbro del medico sportivo.",
  ].join(" ");
}

function nonCompetitiveText(name = "Mario Rossi") {
  return [
    `Si certifica che ${name} è idoneo alla pratica sportiva non agonistica.`,
    "Data di rilascio 01/09/2026.",
    "Scadenza 01/09/2027.",
    "Firma e timbro del medico sportivo.",
  ].join(" ");
}

describe("policy certificato medico", () => {
  it("distingue agonistico e non agonistico dal testo", () => {
    expect(detectCertificateKind(competitiveText())).toBe("COMPETITIVE");
    expect(detectCertificateKind(nonCompetitiveText())).toBe("NON_COMPETITIVE");
    expect(detectCertificateKind("sana e robusta costituzione del paziente")).toBeNull();
    expect(GENERIC_CERTIFICATE_HINTS.some((hint) => "sana e robusta costituzione".includes(hint))).toBe(true);
  });

  it("1. edizione agonistica con certificato agonistico coerente va in PREVALIDATED", () => {
    const facts = inspectCertificateText({
      text: competitiveText(),
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.recognizedKind).toBe("COMPETITIVE");
    expect(facts.anomalies).toEqual([]);
    expect(statusFromAnomalies(facts.anomalies)).toBe("PREVALIDATED");
    expect(approvalReasonCode("COMPETITIVE")).toBe("AGONISTIC_FOOTBALL_CERTIFICATE");
  });

  it("2. edizione non agonistica con certificato non agonistico coerente va in PREVALIDATED", () => {
    const facts = inspectCertificateText({
      text: nonCompetitiveText(),
      requiredKind: "NON_COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.recognizedKind).toBe("NON_COMPETITIVE");
    expect(facts.anomalies).toEqual([]);
    expect(statusFromAnomalies(facts.anomalies)).toBe("PREVALIDATED");
  });

  it("3. edizione agonistica con certificato non agonistico segnala KIND_MISMATCH", () => {
    const facts = inspectCertificateText({
      text: nonCompetitiveText(),
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.anomalies).toContain("KIND_MISMATCH");
    expect(statusFromAnomalies(facts.anomalies)).toBe("PENDING_REVIEW");
  });

  it("4. edizione non agonistica con certificato agonistico segnala KIND_MISMATCH", () => {
    const facts = inspectCertificateText({
      text: competitiveText(),
      requiredKind: "NON_COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.anomalies).toContain("KIND_MISMATCH");
  });

  it("5. scadenza nel passato è apparentemente scaduto, non un rifiuto", () => {
    const facts = inspectCertificateText({
      text: [
        "Si certifica che Mario Rossi è idoneo alla pratica sportiva agonistica per il calcio.",
        "Data di rilascio 01/09/2024.",
        "Scadenza 01/09/2025.",
        "Firma e timbro del medico sportivo.",
      ].join(" "),
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.anomalies).toContain("APPARENTLY_EXPIRED");
    expect(statusFromAnomalies(facts.anomalies)).toBe("PENDING_REVIEW");
  });

  it("6. date assenti: scadenza non riconoscibile", () => {
    const facts = inspectCertificateText({
      text: [
        "Si certifica che Mario Rossi è idoneo alla pratica sportiva agonistica per il calcio.",
        "Firma e timbro del medico sportivo visibili sul documento.",
      ].join(" "),
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.anomalies).toContain("EXPIRY_UNREADABLE");
  });

  it("7. testo troppo corto è incompleto; testo vuoto è illeggibile", () => {
    expect(
      inspectCertificateText({
        text: "ok",
        requiredKind: "COMPETITIVE",
        playerFirstName: "Mario",
        playerLastName: "Rossi",
        now: NOW,
      }).anomalies,
    ).toContain("INCOMPLETE");
    expect(
      inspectCertificateText({
        text: "   ",
        requiredKind: "COMPETITIVE",
        playerFirstName: "Mario",
        playerLastName: "Rossi",
        now: NOW,
      }).anomalies,
    ).toEqual(["UNREADABLE"]);
  });

  it("8. nominativo non corrispondente", () => {
    const facts = inspectCertificateText({
      text: competitiveText("Luca Bianchi"),
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.anomalies).toContain("NAME_MISMATCH");
    expect(facts.nameMatch).toBe("MISMATCH");
  });

  it("non agonistico usa il tetto dei 12 mesi dal rilascio", () => {
    const facts = inspectCertificateText({
      text: [
        "Si certifica che Mario Rossi è idoneo alla pratica sportiva non agonistica.",
        "Data di rilascio 01/09/2025.",
        "Scadenza 01/09/2028.",
        "Firma e timbro del medico sportivo.",
      ].join(" "),
      requiredKind: "NON_COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
      nonCompetitiveValidityMonths: 12,
    });
    expect(facts.anomalies).toContain("APPARENTLY_EXPIRED");
  });

  it("9. il cambio di requisito riallinea solo i documenti aperti", () => {
    const open = realignOpenDocument({
      status: "PREVALIDATED",
      requiredKindNow: "NON_COMPETITIVE",
      recognizedKind: "COMPETITIVE",
      anomalies: [],
    });
    expect(open.anomalies).toContain("KIND_MISMATCH");
    expect(open.status).toBe("PENDING_REVIEW");

    const approved = realignOpenDocument({
      status: "APPROVED",
      requiredKindNow: "NON_COMPETITIVE",
      recognizedKind: "COMPETITIVE",
      anomalies: [],
    });
    expect(approved.status).toBe("APPROVED");
    expect(approved.anomalies).toEqual([]);
  });

  it("un certificato generico non è idoneità sportiva", () => {
    const facts = inspectCertificateText({
      text: "Si attesta la sana e robusta costituzione di Mario Rossi. Firma e timbro del medico sportivo. Data di rilascio 01/09/2026. Scadenza 01/09/2027.",
      requiredKind: "COMPETITIVE",
      playerFirstName: "Mario",
      playerLastName: "Rossi",
      now: NOW,
    });
    expect(facts.recognizedKind).toBeNull();
    expect(facts.anomalies).toContain("UNCLASSIFIED");
    expect(statusFromAnomalies(facts.anomalies)).toBe("PENDING_REVIEW");
  });

  it("il non agonistico propone il minimo tra scadenza scritta e rilascio più 12 mesi", () => {
    const issuedAt = new Date("2026-09-01T00:00:00.000Z");
    const written = new Date("2028-09-01T00:00:00.000Z");
    const proposed = proposedCertificateExpiry({
      requiredKind: "NON_COMPETITIVE",
      issuedAt,
      expiresAt: written,
      nonCompetitiveValidityMonths: 12,
    });
    expect(proposed?.toISOString().slice(0, 10)).toBe("2027-09-01");
    expect(
      proposedCertificateExpiry({
        requiredKind: "COMPETITIVE",
        issuedAt,
        expiresAt: written,
      })?.toISOString().slice(0, 10),
    ).toBe("2028-09-01");
  });

  it("10. un documento già approvato resta approvato dopo il cambio di requisito", () => {
    const next = realignInspectionAnomalies({
      requiredKindNow: "NON_COMPETITIVE",
      recognizedKind: "COMPETITIVE",
      anomalies: [],
    });
    expect(next).toContain("KIND_MISMATCH");
    const kept = realignOpenDocument({
      status: "APPROVED",
      requiredKindNow: "NON_COMPETITIVE",
      recognizedKind: "COMPETITIVE",
      anomalies: next,
    });
    expect(kept.status).toBe("APPROVED");
  });
});
