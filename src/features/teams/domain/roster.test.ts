import { describe, expect, it } from "vitest";
import { toRosterRow } from "./roster";

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
      firstName: "Anna",
      lastName: "Rossi",
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
});
