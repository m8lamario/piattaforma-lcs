import { describe, expect, it } from "vitest";
import { shellNavFlags } from "./shellNav";

describe("shellNavFlags", () => {
  it("per il rappresentante mostra panoramica squadra e scuola, non compagni né consensi", () => {
    expect(
      shellNavFlags({
        isRepresentative: true,
        isStaffOrReviewer: false,
        hasMembership: true,
        hasPlayerRegistration: false,
      }),
    ).toEqual({
      showTeam: true,
      showAdmin: false,
      showSchool: true,
      showPlayerTeam: false,
      showConsents: false,
    });
  });

  it("se il rappresentante è anche giocatore mostra i consensi e non i compagni", () => {
    const flags = shellNavFlags({
      isRepresentative: true,
      isStaffOrReviewer: false,
      hasMembership: true,
      hasPlayerRegistration: true,
    });
    expect(flags.showConsents).toBe(true);
    expect(flags.showPlayerTeam).toBe(false);
  });

  it("per il solo giocatore mostra consensi e compagni", () => {
    expect(
      shellNavFlags({
        isRepresentative: false,
        isStaffOrReviewer: false,
        hasMembership: true,
        hasPlayerRegistration: true,
      }),
    ).toMatchObject({
      showTeam: false,
      showSchool: false,
      showPlayerTeam: true,
      showConsents: true,
    });
  });
});
