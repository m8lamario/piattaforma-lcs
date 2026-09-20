import { describe, expect, it } from "vitest";
import { toRosterRow, toTeammateRow, summarizeRoster } from "./roster";

describe("team roster projection", () => {
  it("espone solo nome, stato iscrizione e stato certificato", () => {
    const row = toRosterRow({
      registrationId: "r1",
      firstName: "Anna",
      lastName: "Rossi",
      registrationStatus: "IN_PROGRESS",
      medicalStatus: "PENDING_REVIEW",
    });
    expect(row).toEqual({
      registrationId: "r1",
      userId: undefined,
      membershipId: undefined,
      membershipRole: undefined,
      firstName: "Anna",
      lastName: "Rossi",
      jerseyNumber: null,
      rosterRole: null,
      registrationStatus: "IN_PROGRESS",
      medicalStatus: "pending",
    });
    expect(Object.keys(row)).not.toContain("fiscalCode");
    expect(Object.keys(row)).not.toContain("storageKey");
    expect(Object.keys(row)).not.toContain("email");
  });

  it("mappa CHANGES_REQUESTED come certificato da ricaricare, senza motivo", () => {
    const row = toRosterRow({
      registrationId: "r2",
      firstName: "Luca",
      lastName: "Verdi",
      registrationStatus: "IN_PROGRESS",
      medicalStatus: "CHANGES_REQUESTED",
    });
    expect(row.medicalStatus).toBe("rejected");
  });

  it("conteggia la rosa senza PII extra", () => {
    const counts = summarizeRoster([
      { registrationStatus: "APPROVED", medicalStatus: "approved" },
      { registrationStatus: "IN_PROGRESS", medicalStatus: "pending" },
      { registrationStatus: "CHANGES_REQUESTED", medicalStatus: "rejected" },
      { registrationStatus: "ACCOUNT_CREATED", medicalStatus: "none" },
      { registrationStatus: "WITHDRAWN", medicalStatus: "none" },
    ]);
    expect(counts).toEqual({
      total: 5,
      invited: 1,
      inProgress: 1,
      attention: 1,
      ok: 1,
      withdrawn: 1,
    });
  });

  it("nella vista compagni non espone stato medico", () => {
    const row = toTeammateRow({
      userId: "u1",
      firstName: "Anna",
      lastName: "Rossi",
      jerseyNumber: "7",
      rosterRole: "Playmaker",
    });
    expect(row).toEqual({
      userId: "u1",
      firstName: "Anna",
      lastName: "Rossi",
      jerseyNumber: "7",
      rosterRole: "Playmaker",
    });
    expect(Object.keys(row)).not.toContain("medicalStatus");
    expect(Object.keys(row)).not.toContain("fiscalCode");
    expect(Object.keys(row)).not.toContain("email");
  });
});
