import { describe, expect, it } from "vitest";
import { activationErrorCode, inspectActivation, type ActivationRecord } from "./activation";

function record(overrides: Partial<ActivationRecord> = {}): ActivationRecord {
  return {
    status: "APPROVED",
    activationTokenHash: "abc",
    activationExpiresAt: new Date(Date.now() + 60_000),
    activatedAt: null,
    userPasswordHash: null,
    ...overrides,
  };
}

describe("token di attivazione", () => {
  it("accetta un token approvato, non usato e non scaduto", () => {
    expect(inspectActivation(record())).toBe("ok");
  });

  it("rifiuta un token sconosciuto o una richiesta non approvata", () => {
    expect(inspectActivation(null)).toBe("invalid");
    expect(inspectActivation(record({ status: "PENDING" }))).toBe("invalid");
    expect(inspectActivation(record({ status: "REJECTED" }))).toBe("invalid");
    expect(inspectActivation(record({ activationTokenHash: null }))).toBe("invalid");
    expect(activationErrorCode("invalid")).toBe("SCHOOL_ACCESS_TOKEN_INVALID");
  });

  it("rifiuta un token scaduto", () => {
    expect(inspectActivation(record({ activationExpiresAt: new Date(Date.now() - 1000) }))).toBe("expired");
    expect(activationErrorCode("expired")).toBe("SCHOOL_ACCESS_TOKEN_EXPIRED");
  });

  it("rifiuta un token già utilizzato", () => {
    expect(inspectActivation(record({ activatedAt: new Date() }))).toBe("used");
    expect(activationErrorCode("used")).toBe("SCHOOL_ACCESS_TOKEN_USED");
  });

  it("rifiuta un account già attivato con password", () => {
    expect(inspectActivation(record({ userPasswordHash: "hash" }))).toBe("already_activated");
    expect(activationErrorCode("already_activated")).toBe("SCHOOL_ACCESS_ALREADY_ACTIVATED");
  });
});
