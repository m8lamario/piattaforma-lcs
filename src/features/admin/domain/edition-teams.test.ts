import { describe, expect, it } from "vitest";
import {
  editionTeamsExportFilename,
  editionTeamsToCsv,
  isPlayerAccountStarted,
  isPlayerRegistrationCompleted,
  summarizeEditionTeamPlayers,
  toEditionTeamRows,
} from "./edition-teams";

describe("conteggi giocatori edizione", () => {
  it("distingue account avviati da registrazioni completate e ignora staff e rimossi", () => {
    expect(isPlayerAccountStarted({ category: "PLAYER", status: "INVITED" })).toBe(false);
    expect(isPlayerAccountStarted({ category: "PLAYER", status: "ACCOUNT_CREATED" })).toBe(true);
    expect(isPlayerAccountStarted({ category: "STAFF", status: "ACCOUNT_CREATED" })).toBe(false);
    expect(isPlayerAccountStarted({ category: "PLAYER", status: "REMOVED" })).toBe(false);
    expect(isPlayerRegistrationCompleted({ category: "PLAYER", status: "APPROVED" })).toBe(true);
    expect(isPlayerRegistrationCompleted({ category: "PLAYER", status: "PAYMENT_PENDING" })).toBe(false);

    expect(
      summarizeEditionTeamPlayers([
        { category: "PLAYER", status: "INVITED" },
        { category: "PLAYER", status: "ACCOUNT_CREATED" },
        { category: "PLAYER", status: "IN_PROGRESS" },
        { category: "PLAYER", status: "APPROVED" },
        { category: "PLAYER", status: "WITHDRAWN" },
        { category: "PLAYER", status: "REMOVED" },
        { category: "STAFF", status: "APPROVED" },
      ]),
    ).toEqual({ accountsStarted: 4, registrationsCompleted: 1 });
  });
});

describe("export squadre edizione", () => {
  it("ordina per scuola e squadra e lascia vuoti i campi assenti", () => {
    const rows = toEditionTeamRows([
      {
        id: "b",
        name: "Under 16",
        school: { name: "Istituto Galilei", city: "Brescia" },
        representative: { name: "Luca Bianchi", email: "luca@example.test" },
        registrations: [{ category: "PLAYER", status: "APPROVED" }],
      },
      {
        id: "a",
        name: "Prima squadra",
        contactName: "Anna Verdi",
        school: { name: "Istituto Fermi", city: null },
        representative: null,
        registrations: [
          { category: "PLAYER", status: "ACCOUNT_CREATED" },
          { category: "PLAYER", status: "APPROVED" },
        ],
      },
    ]);
    expect(rows.map((row) => `${row.schoolName}|${row.teamName}`)).toEqual([
      "Istituto Fermi|Prima squadra",
      "Istituto Galilei|Under 16",
    ]);
    expect(rows[0]).toMatchObject({
      schoolCity: "",
      representativeName: "Anna Verdi",
      representativeEmail: "",
      accountsStarted: 2,
      registrationsCompleted: 1,
    });
  });

  it("produce un CSV con intestazioni italiane, BOM e formule neutralizzate", () => {
    const csv = editionTeamsToCsv([
      {
        id: "1",
        schoolName: "=cmd",
        schoolCity: "Milano",
        teamName: "Azzurri",
        representativeName: "",
        representativeEmail: "ref@example.test",
        accountsStarted: 3,
        registrationsCompleted: 1,
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Scuola;Città;Squadra;Referente;Email referente;Account avviati;Registrazioni completate");
    expect(csv).toContain("'=cmd;Milano;Azzurri;;ref@example.test;3;1");
    expect(
      editionTeamsExportFilename({
        competitionName: "Leonessa Cup",
        editionName: "Edizione primaverile",
        year: 2026,
      }),
    ).toBe("leonessa-cup-edizione-primaverile-2026-squadre.csv");
  });
});
