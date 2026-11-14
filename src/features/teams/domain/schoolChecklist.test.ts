import { describe, expect, it } from "vitest";
import { projectSchoolChecklist, type SchoolChecklistPlayer } from "./schoolChecklist";

function player(overrides: Partial<SchoolChecklistPlayer> = {}): SchoolChecklistPlayer {
  return {
    personalDataComplete: true,
    guardianState: "na",
    privacyComplete: true,
    mediaComplete: true,
    paymentCovered: true,
    medicalOk: true,
    ...overrides,
  };
}

describe("checklist scuola", () => {
  it("è amministrativamente completa anche senza certificati", () => {
    const result = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: false,
      paymentMode: "PLAYER",
      teamFee: { status: "not_due" },
      teamPaymentSucceeded: false,
      players: [player({ medicalOk: false }), player({ medicalOk: false })],
      ownRegistrationDue: false,
    });
    expect(result.administrativeComplete).toBe(true);
    expect(result.items.find((item) => item.id === "medical")).toMatchObject({
      administrative: false,
      status: "attention",
      count: 2,
    });
  });

  it("mostra un certificato rifiutato fuori dal conteggio amministrativo", () => {
    const result = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: false,
      paymentMode: "TEAM",
      teamFee: { status: "ready", cents: 1000 },
      teamPaymentSucceeded: true,
      players: [player({ medicalOk: false })],
      ownRegistrationDue: false,
    });
    expect(result.administrativeComplete).toBe(true);
    expect(result.items.filter((item) => item.administrative && item.status !== "complete")).toEqual([]);
    expect(result.items.find((item) => item.id === "medical")?.status).toBe("attention");
  });

  it("tratta la quota squadra mancante come attesa dell’organizzazione", () => {
    const result = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: false,
      paymentMode: "TEAM",
      teamFee: { status: "missing" },
      teamPaymentSucceeded: false,
      players: [player()],
      ownRegistrationDue: false,
    });
    expect(result.items.find((item) => item.id === "teamPayment")).toMatchObject({
      status: "waiting_on_org",
      administrative: true,
    });
    expect(result.administrativeComplete).toBe(true);
  });

  it("non mescola i giocatori di un’altra rosa", () => {
    const own = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: true,
      paymentMode: "PLAYER",
      teamFee: { status: "not_due" },
      teamPaymentSucceeded: false,
      players: [player({ personalDataComplete: false })],
      ownRegistrationDue: false,
    });
    const other = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: false,
      paymentMode: "PLAYER",
      teamFee: { status: "not_due" },
      teamPaymentSucceeded: false,
      players: [player()],
      ownRegistrationDue: false,
    });
    expect(own.items.find((item) => item.id === "personal")?.count).toBe(1);
    expect(own.items.find((item) => item.id === "coach")?.status).toBe("todo");
    expect(other.administrativeComplete).toBe(true);
    expect(other.items.find((item) => item.id === "personal")?.count).toBe(0);
  });
});
