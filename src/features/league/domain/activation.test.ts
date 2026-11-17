import { describe, expect, it } from "vitest";
import { inspectLeagueActivation, leagueActivationErrorCode } from "./activation";

const pending = {
  status: "ACTIVE" as const,
  activationTokenHash: "hash",
  activationExpiresAt: new Date("2027-01-01"),
  activatedAt: null,
  userPasswordHash: null,
};

describe("league activation", () => {
  it("accetta un token ancora valido", () => {
    expect(inspectLeagueActivation(pending, new Date("2026-01-01"))).toBe("ok");
  });

  it("mappa gli esiti sui codici errore", () => {
    expect(leagueActivationErrorCode("suspended")).toBe("LEAGUE_SUSPENDED");
    expect(leagueActivationErrorCode("invalid")).toBe("LEAGUE_TOKEN_INVALID");
    expect(inspectLeagueActivation({ ...pending, status: "SUSPENDED" })).toBe("suspended");
    expect(inspectLeagueActivation({ ...pending, activatedAt: new Date() })).toBe("used");
    expect(inspectLeagueActivation({ ...pending, userPasswordHash: "x" })).toBe("already_activated");
  });
});
