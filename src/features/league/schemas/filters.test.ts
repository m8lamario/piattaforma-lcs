import { describe, expect, it } from "vitest";
import { parseLeaguePlayerFilters } from "./filters";

describe("parseLeaguePlayerFilters", () => {
  it("ignora editionId inviato dal client", () => {
    expect(
      parseLeaguePlayerFilters({
        editionId: "edition-b",
        q: "anna",
        schoolId: "school-a",
        status: "APPROVED",
      }),
    ).toEqual({
      q: "anna",
      schoolId: "school-a",
      status: "APPROVED",
    });
    expect(parseLeaguePlayerFilters({ editionId: "edition-b" })).not.toHaveProperty("editionId");
  });
});
