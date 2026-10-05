import { describe, expect, it } from "vitest";
import {
  isTeamFeePayment,
  paymentScopeViolation,
  registrationMatchesTeam,
  teamBelongsToCompetition,
} from "./hierarchy";

describe("gerarchia Competition → Edition → Team → Registration", () => {
  it("accetta una registrazione sulla squadra della stessa edizione", () => {
    expect(
      registrationMatchesTeam({
        teamId: "team-2026",
        teamEditionId: "edition-2026",
        registrationTeamId: "team-2026",
        registrationEditionId: "edition-2026",
      }),
    ).toBe(true);
  });

  it("rifiuta una squadra dell'edizione A su una registrazione dell'edizione B", () => {
    expect(
      registrationMatchesTeam({
        teamId: "team-2026",
        teamEditionId: "edition-2026",
        registrationTeamId: "team-2026",
        registrationEditionId: "edition-2027",
      }),
    ).toBe(false);
  });

  it("rifiuta una squadra di un'altra competition anche se l'id è noto", () => {
    expect(teamBelongsToCompetition("competition-a", "competition-b")).toBe(false);
    expect(teamBelongsToCompetition("competition-a", "competition-a")).toBe(true);
  });
});

describe("scope pagamento", () => {
  it("accetta la quota giocatore e la quota squadra", () => {
    expect(
      paymentScopeViolation({
        editionId: "edition-2026",
        registrationId: "reg-1",
        registrationEditionId: "edition-2026",
        registrationTeamId: "team-2026",
      }),
    ).toBeNull();
    expect(
      paymentScopeViolation({
        editionId: "edition-2026",
        teamId: "team-2026",
        teamEditionId: "edition-2026",
      }),
    ).toBeNull();
  });

  it("rifiuta squadra dell'edizione A e pagamento dell'edizione B", () => {
    expect(
      paymentScopeViolation({
        editionId: "edition-2027",
        teamId: "team-2026",
        teamEditionId: "edition-2026",
      }),
    ).toBe("team_edition");
  });

  it("rifiuta una registrazione di un'altra edizione", () => {
    expect(
      paymentScopeViolation({
        editionId: "edition-2027",
        registrationId: "reg-2026",
        registrationEditionId: "edition-2026",
        registrationTeamId: "team-2026",
      }),
    ).toBe("registration_edition");
  });

  it("rifiuta registrazione e squadra diverse anche nella stessa edizione", () => {
    expect(
      paymentScopeViolation({
        editionId: "edition-2026",
        teamId: "team-other",
        teamEditionId: "edition-2026",
        registrationId: "reg-1",
        registrationEditionId: "edition-2026",
        registrationTeamId: "team-2026",
      }),
    ).toBe("registration_team");
  });

  it("distingue la quota squadra da quella del giocatore", () => {
    expect(isTeamFeePayment({ teamId: "team-1", registrationId: null })).toBe(true);
    expect(isTeamFeePayment({ teamId: "team-1", registrationId: "reg-1" })).toBe(false);
    expect(isTeamFeePayment({ teamId: null, registrationId: "reg-1" })).toBe(false);
  });
});
