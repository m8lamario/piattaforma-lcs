import { describe, expect, it } from "vitest";
import { leaguePlayersToCsv, leagueSummaryToCsv } from "./csv";
import type { LeaguePlayerRecord, LeagueSchoolRecord } from "./status";

describe("league csv", () => {
  it("esporta solo le colonne di supervisione", () => {
    const row: LeaguePlayerRecord = {
      registrationId: "r1",
      firstName: "Anna",
      lastName: "Bianchi",
      schoolId: "s1",
      schoolName: "Liceo Alfa",
      teamName: "Alfa",
      teamCountInSchool: 1,
      registrationStatus: "APPROVED",
      medicalStatus: "approved",
      paymentStatus: "paid",
      completedAt: "2026-03-01T10:00:00.000Z",
    };
    const csv = leaguePlayersToCsv([row], {
      status: () => "Iscrizione approvata",
      medical: () => "Valido",
      payment: () => "Saldato",
      completedAt: (value) => value ?? "",
    });
    expect(csv).toContain("Nome;Cognome;Scuola");
    expect(csv).not.toContain("storageKey");
    expect(csv).not.toContain("fiscalCode");
    expect(csv).not.toContain("receiptUrl");
    expect(csv).not.toContain("reason");
    expect(csv).not.toContain("@");
  });

  it("esporta il riepilogo per scuola", () => {
    const school: LeagueSchoolRecord = {
      schoolId: "s1",
      schoolName: "Liceo Alfa",
      city: "Torino",
      teamNames: ["Alfa"],
      playerCount: 2,
      completedCount: 1,
      incompleteCount: 1,
      withdrawnCount: 0,
      percent: 50,
      status: "in_progress",
      issues: [],
    };
    expect(leagueSummaryToCsv([school], () => "In corso")).toContain("Liceo Alfa;2;1;1;50%;In corso");
  });
});
