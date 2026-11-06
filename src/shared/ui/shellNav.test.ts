import { describe, expect, it } from "vitest";
import { homeForShellFlags, shellNavFlags } from "./shellNav";

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
      showMedia: false,
      mediaUnderAdmin: false,
      showArea: true,
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

  it("per il media partner mostra solo la verifica se non ha altri ruoli", () => {
    expect(
      shellNavFlags({
        isRepresentative: false,
        isStaffOrReviewer: false,
        hasMembership: false,
        hasPlayerRegistration: false,
        canVerifyMedia: true,
      }),
    ).toMatchObject({
      showMedia: true,
      showArea: false,
      showAdmin: false,
      showTeam: false,
    });
  });

  it("per il super admin nasconde area personale e annida verifica media sotto organizzazione", () => {
    expect(
      shellNavFlags({
        isRepresentative: false,
        isStaffOrReviewer: true,
        hasMembership: false,
        hasPlayerRegistration: false,
        canVerifyMedia: true,
        isSuperAdmin: true,
      }),
    ).toEqual({
      showTeam: false,
      showAdmin: true,
      showSchool: false,
      showPlayerTeam: false,
      showConsents: false,
      showMedia: true,
      mediaUnderAdmin: true,
      showArea: false,
    });
  });

  it("manda la visualizzazione alla home del soggetto", () => {
    const player = shellNavFlags({
      isRepresentative: false,
      isStaffOrReviewer: false,
      hasMembership: true,
      hasPlayerRegistration: true,
    });
    expect(homeForShellFlags(player)).toBe("/area");
    const partner = shellNavFlags({
      isRepresentative: false,
      isStaffOrReviewer: false,
      hasMembership: false,
      hasPlayerRegistration: false,
      canVerifyMedia: true,
    });
    expect(homeForShellFlags(partner)).toBe("/media");
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
