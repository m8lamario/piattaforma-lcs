import { describe, expect, it } from "vitest";
import { resolveSelectedTeamId } from "./selection";

describe("resolveSelectedTeamId", () => {
  it("ignora un teamId non autorizzato nel cookie", () => {
    expect(resolveSelectedTeamId(["team-1", "team-2"], "team-other")).toBe("team-1");
    expect(resolveSelectedTeamId(["team-1", "team-2"], "team-2")).toBe("team-2");
  });
});
