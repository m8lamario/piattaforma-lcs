import { describe, expect, it } from "vitest";
import { inspectMediaActivation, mediaActivationErrorCode } from "./activation";

const future = new Date(Date.now() + 60_000);

describe("attivazione account media partner", () => {
  it("accetta un token valido non usato", () => {
    expect(
      inspectMediaActivation({
        status: "ACTIVE",
        activationTokenHash: "hash",
        activationExpiresAt: future,
        activatedAt: null,
        userPasswordHash: null,
      }),
    ).toBe("ok");
  });

  it("rifiuta sospesi, scaduti e già attivati", () => {
    expect(
      inspectMediaActivation({
        status: "SUSPENDED",
        activationTokenHash: "hash",
        activationExpiresAt: future,
        activatedAt: null,
        userPasswordHash: null,
      }),
    ).toBe("suspended");
    expect(
      inspectMediaActivation({
        status: "ACTIVE",
        activationTokenHash: "hash",
        activationExpiresAt: new Date(Date.now() - 1000),
        activatedAt: null,
        userPasswordHash: null,
      }),
    ).toBe("expired");
    expect(
      inspectMediaActivation({
        status: "ACTIVE",
        activationTokenHash: "hash",
        activationExpiresAt: future,
        activatedAt: new Date(),
        userPasswordHash: null,
      }),
    ).toBe("used");
    expect(mediaActivationErrorCode("suspended")).toBe("MEDIA_PARTNER_SUSPENDED");
    expect(mediaActivationErrorCode("invalid")).toBe("MEDIA_PARTNER_TOKEN_INVALID");
  });
});
