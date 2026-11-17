import { describe, expect, it } from "vitest";
import {
  filterLeaguePlayers,
  leagueCompletionDate,
  leagueMedicalStatus,
  leaguePaymentStatus,
  leaguePlayersWhere,
  matchesLeaguePlayerFilters,
  summarizeLeagueOverview,
  summarizeLeagueSchool,
  type LeaguePlayerRecord,
} from "./status";

function player(overrides: Partial<LeaguePlayerRecord> = {}): LeaguePlayerRecord {
  return {
    registrationId: "r1",
    firstName: "Anna",
    lastName: "Bianchi",
    schoolId: "school-a",
    schoolName: "Liceo Alfa",
    teamName: "Alfa",
    teamCountInSchool: 1,
    registrationStatus: "IN_PROGRESS",
    medicalStatus: "pending",
    paymentStatus: "pending",
    completedAt: null,
    ...overrides,
  };
}

describe("league status", () => {
  it("collassa gli stati medici come la rosa, con scadenza su approved", () => {
    expect(leagueMedicalStatus(null, null)).toBe("none");
    expect(leagueMedicalStatus("UPLOADED", null)).toBe("pending");
    expect(leagueMedicalStatus("PROCESSING", null)).toBe("pending");
    expect(leagueMedicalStatus("PENDING_REVIEW", null)).toBe("pending");
    expect(leagueMedicalStatus("PREVALIDATED", null)).toBe("pending");
    expect(leagueMedicalStatus("APPROVED", null)).toBe("approved");
    expect(leagueMedicalStatus("REJECTED", null)).toBe("rejected");
    expect(leagueMedicalStatus("EXPIRED", null)).toBe("none");
    expect(leagueMedicalStatus("APPROVED", new Date("2020-01-01"), new Date("2026-01-01"))).toBe("expired");
  });

  it("segna il pagamento coperto e lascia in sospeso la quota dovuta", () => {
    expect(
      leaguePaymentStatus({ paymentMode: "PLAYER", playerSucceeded: true, teamSucceeded: false }),
    ).toBe("paid");
    expect(
      leaguePaymentStatus({ paymentMode: "TEAM", playerSucceeded: false, teamSucceeded: true }),
    ).toBe("paid");
    expect(
      leaguePaymentStatus({ paymentMode: "TEAM", playerSucceeded: false, teamSucceeded: false }),
    ).toBe("pending");
    expect(
      leaguePaymentStatus({ paymentMode: "BOTH", playerSucceeded: false, teamSucceeded: false }),
    ).toBe("pending");
  });

  it("usa reviewedAt solo se l'iscrizione è approvata", () => {
    const when = new Date("2026-03-01T10:00:00.000Z");
    expect(leagueCompletionDate("APPROVED", when)).toBe(when.toISOString());
    expect(leagueCompletionDate("IN_PROGRESS", when)).toBeNull();
    expect(leagueCompletionDate("APPROVED", null)).toBeNull();
  });

  it("classifica la scuola: vuota, in corso, criticità, completata", () => {
    const school = { schoolId: "school-a", schoolName: "Liceo Alfa", city: "Torino", teamNames: ["Alfa"] };
    expect(summarizeLeagueSchool(school, []).status).toBe("empty");
    expect(summarizeLeagueSchool(school, []).percent).toBe(0);
    expect(
      summarizeLeagueSchool(school, [
        player({
          registrationStatus: "IN_PROGRESS",
          medicalStatus: "pending",
          paymentStatus: "paid",
        }),
      ]).status,
    ).toBe("in_progress");
    expect(
      summarizeLeagueSchool(school, [
        player({ medicalStatus: "rejected", registrationStatus: "CHANGES_REQUESTED" }),
      ]).status,
    ).toBe("issues");
    expect(
      summarizeLeagueSchool(school, [
        player({ registrationStatus: "APPROVED", medicalStatus: "approved", paymentStatus: "paid" }),
      ]).status,
    ).toBe("completed");
    expect(
      summarizeLeagueSchool(school, [
        player({ registrationStatus: "APPROVED", medicalStatus: "approved", paymentStatus: "paid" }),
        player({
          registrationId: "r2",
          registrationStatus: "WITHDRAWN",
          medicalStatus: "none",
          paymentStatus: "not_due",
        }),
      ]).percent,
    ).toBe(100);
  });

  it("filtra in AND e non include altre scuole", () => {
    const rows = [
      player(),
      player({
        registrationId: "r2",
        firstName: "Luca",
        lastName: "Verdi",
        schoolId: "school-b",
        schoolName: "Liceo Beta",
        registrationStatus: "APPROVED",
        medicalStatus: "approved",
        paymentStatus: "paid",
      }),
    ];
    expect(filterLeaguePlayers(rows, { q: "luca", schoolId: "school-b" }).map((row) => row.registrationId)).toEqual([
      "r2",
    ]);
    expect(matchesLeaguePlayerFilters(rows[1], { schoolId: "school-a" })).toBe(false);
    expect(filterLeaguePlayers(rows, { medical: "approved", payment: "paid" })).toHaveLength(1);
  });

  it("circoscrive le query all'edizione del server", () => {
    expect(leaguePlayersWhere("edition-a")).toEqual({
      editionId: "edition-a",
      category: "PLAYER",
      status: { not: "REMOVED" },
    });
  });

  it("conta panoramica senza i ritirati", () => {
    const schools = [
      summarizeLeagueSchool(
        { schoolId: "school-a", schoolName: "Alfa", city: "", teamNames: ["Alfa"] },
        [
          player({ registrationStatus: "APPROVED", medicalStatus: "approved", paymentStatus: "paid" }),
          player({
            registrationId: "r2",
            registrationStatus: "WITHDRAWN",
            medicalStatus: "none",
            paymentStatus: "not_due",
          }),
        ],
      ),
    ];
    const overview = summarizeLeagueOverview(schools, [
      player({ registrationStatus: "APPROVED", medicalStatus: "approved", paymentStatus: "paid" }),
      player({
        registrationId: "r2",
        registrationStatus: "WITHDRAWN",
        medicalStatus: "none",
        paymentStatus: "not_due",
      }),
    ]);
    expect(overview.playerCount).toBe(1);
    expect(overview.schoolsCompleted).toBe(1);
    expect(overview.docsComplete).toBe(1);
  });
});
