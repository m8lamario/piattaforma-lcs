import { describe, expect, it } from "vitest";
import {
  aiApproveBlockedByKindChange,
  aiExpiryRule,
  aiKindLabel,
  canRevokeAiApproval,
  clampAiListLimit,
  decodeAiListCursor,
  encodeAiListCursor,
  isAiActionable,
  nonCompetitiveExpiryFromVisit,
  parseAiApproveDates,
  parseAiReviewText,
  validateAiApproveDates,
} from "./aiReview";

describe("coda AI certificati", () => {
  const pending = {
    typeCode: "MEDICAL_CERTIFICATE",
    status: "PENDING_REVIEW",
    aiReviewState: "NONE",
    blobPurgedAt: null,
  };

  it("elenca solo i certificati in attesa non ancora valutati", () => {
    expect(isAiActionable(pending)).toBe(true);
    expect(isAiActionable({ ...pending, status: "PREVALIDATED" })).toBe(true);
    expect(isAiActionable({ ...pending, aiReviewState: "FLAGGED" })).toBe(false);
    expect(isAiActionable({ ...pending, aiReviewState: "RETURNED" })).toBe(false);
    expect(isAiActionable({ ...pending, status: "APPROVED" })).toBe(false);
    expect(isAiActionable({ ...pending, status: "REJECTED" })).toBe(false);
    expect(isAiActionable({ ...pending, status: "EXPIRED" })).toBe(false);
    expect(isAiActionable({ ...pending, blobPurgedAt: new Date() })).toBe(false);
  });

  it("blocca l’approvazione se il tipo dell’edizione è cambiato", () => {
    expect(aiApproveBlockedByKindChange("COMPETITIVE", "NON_COMPETITIVE")).toBe(true);
    expect(aiApproveBlockedByKindChange("NON_COMPETITIVE", "NON_COMPETITIVE")).toBe(false);
  });

  it("annulla solo un’approvazione AI ancora in vigore", () => {
    expect(canRevokeAiApproval({ status: "APPROVED", aiReviewState: "APPROVED" })).toBe(true);
    expect(canRevokeAiApproval({ status: "PENDING_REVIEW", aiReviewState: "RETURNED" })).toBe(false);
    expect(canRevokeAiApproval({ status: "APPROVED", aiReviewState: "NONE" })).toBe(false);
  });

  it("etichetta il tipo richiesto in italiano", () => {
    expect(aiKindLabel("COMPETITIVE")).toBe("agonistico");
    expect(aiKindLabel("NON_COMPETITIVE")).toBe("non agonistico");
    expect(aiExpiryRule("NON_COMPETITIVE")).toBe("un_anno_dalla_visita");
    expect(aiExpiryRule("COMPETITIVE")).toBe("data_scritta_sul_certificato");
  });
});

describe("paginazione coda AI", () => {
  it("mantiene un cursore stabile su data e id", () => {
    const uploadedAt = new Date("2026-03-01T10:00:00.000Z");
    const cursor = encodeAiListCursor({ uploadedAt, id: "doc_2" });
    expect(decodeAiListCursor(cursor)).toEqual({ uploadedAt, id: "doc_2" });
    expect(decodeAiListCursor("not-a-cursor")).toBeNull();
  });

  it("limita la pagina tra 1 e 50", () => {
    expect(clampAiListLimit(undefined)).toBe(20);
    expect(clampAiListLimit(0)).toBe(1);
    expect(clampAiListLimit(80)).toBe(50);
  });
});

describe("date e nota AI", () => {
  const now = new Date("2026-04-10T12:00:00.000Z");

  it("accetta rilascio non futuro e scadenza successiva a oggi", () => {
    expect(
      validateAiApproveDates(
        {
          issuedAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("ok");
  });

  it("rifiuta scadenza non futura, rilascio futuro o successivo alla scadenza", () => {
    expect(
      validateAiApproveDates(
        {
          issuedAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: new Date("2026-04-10T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("expiry_required");
    expect(
      validateAiApproveDates(
        {
          issuedAt: new Date("2026-04-11T00:00:00.000Z"),
          expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("issued_invalid");
    expect(
      parseAiApproveDates({
        dataRilascio: "2027-01-01",
        dataScadenza: "2026-01-01",
        requiredKind: "COMPETITIVE",
        now,
      }).ok,
    ).toBe(false);
  });

  it("sul non agonistico calcola un anno dalla visita e ignora una scadenza passata", () => {
    const withoutWrittenExpiry = parseAiApproveDates({
      dataRilascio: "2026-01-15",
      requiredKind: "NON_COMPETITIVE",
      now,
    });
    expect(withoutWrittenExpiry.ok).toBe(true);
    if (!withoutWrittenExpiry.ok) return;
    expect(withoutWrittenExpiry.expiryComputed).toBe(true);
    expect(withoutWrittenExpiry.expiresAt.toISOString().slice(0, 10)).toBe("2027-01-15");

    const parsed = parseAiApproveDates({
      dataRilascio: "2026-01-15",
      dataScadenza: "2026-02-01",
      requiredKind: "NON_COMPETITIVE",
      now,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.expiryComputed).toBe(true);
    expect(parsed.expiresAt.toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(nonCompetitiveExpiryFromVisit(new Date("2026-01-31T00:00:00.000Z")).toISOString().slice(0, 10)).toBe(
      "2027-01-31",
    );
  });

  it("sul non agonistico non approva se l’anno dalla visita è già passato", () => {
    expect(
      parseAiApproveDates({
        dataRilascio: "2025-01-15",
        requiredKind: "NON_COMPETITIVE",
        now,
      }),
    ).toEqual({ ok: false, reason: "expiry_required" });
  });

  it("sull’agonistico richiede la scadenza scritta sul certificato", () => {
    expect(
      parseAiApproveDates({
        dataRilascio: "2026-01-15",
        requiredKind: "COMPETITIVE",
        now,
      }).ok,
    ).toBe(false);
    const parsed = parseAiApproveDates({
      dataRilascio: "2026-01-15",
      dataScadenza: "2026-12-01",
      requiredKind: "COMPETITIVE",
      now,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.expiryComputed).toBe(false);
    expect(parsed.expiresAt.toISOString().slice(0, 10)).toBe("2026-12-01");
  });

  it("richiede nota e motivo non vuoti e entro 500 caratteri", () => {
    expect(parseAiReviewText("  ").ok).toBe(false);
    expect(parseAiReviewText("ok").ok).toBe(true);
    expect(parseAiReviewText("x".repeat(501)).ok).toBe(false);
  });
});
