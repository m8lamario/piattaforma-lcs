import { describe, expect, it } from "vitest";
import {
  nextSchoolStep,
  projectSchoolChecklist,
  type SchoolChecklistPlayer,
} from "./schoolChecklist";

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

const ready = {
  representativeEmailVerified: true,
  paymentMode: "PLAYER" as const,
  teamFee: { status: "not_due" as const },
  teamPaymentSucceeded: false,
};

describe("checklist scuola", () => {
  it("è amministrativamente completa anche senza certificati", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: false,
      staffPresent: true,
      canJoinStaff: false,
      players: [player({ medicalOk: false }), player({ medicalOk: false })],
      ownRegistrationDue: false,
    });
    expect(result.administrativeComplete).toBe(true);
    expect(result.next).toBeNull();
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
      staffPresent: true,
      canJoinStaff: false,
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
      staffPresent: true,
      canJoinStaff: false,
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
    expect(result.next).toBeNull();
  });

  it("non mescola i giocatori di un’altra rosa", () => {
    const own = projectSchoolChecklist({
      ...ready,
      coachMissing: true,
      staffPresent: false,
      canJoinStaff: true,
      players: [player({ personalDataComplete: false })],
      ownRegistrationDue: false,
    });
    const other = projectSchoolChecklist({
      ...ready,
      coachMissing: false,
      staffPresent: true,
      canJoinStaff: false,
      players: [player()],
      ownRegistrationDue: false,
    });
    expect(own.items.find((item) => item.id === "personal")?.count).toBe(1);
    expect(own.items.find((item) => item.id === "coach")?.status).toBe("todo");
    expect(other.administrativeComplete).toBe(true);
    expect(other.items.find((item) => item.id === "personal")?.count).toBe(0);
  });

  it("senza staff propone l’iscrizione del referente, non il modulo allenatore vuoto", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: true,
      staffPresent: false,
      canJoinStaff: true,
      players: [player()],
      ownRegistrationDue: false,
    });
    expect(result.administrativeComplete).toBe(false);
    expect(result.next).toEqual({
      id: "staff",
      status: "todo",
      href: "/area#ruolo",
      count: 1,
      undeliverableCount: 0,
    });
  });

  it("se il referente è già giocatore chiede di condividere il link per lo staff", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: true,
      staffPresent: false,
      canJoinStaff: false,
      players: [player({ isOwn: true })],
      ownRegistrationDue: false,
    });
    expect(result.next?.id).toBe("inviteStaff");
    expect(result.next?.href).toBe("/squadra/inviti");
  });

  it("con almeno uno staff propone di indicare l’allenatore", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: true,
      staffPresent: true,
      canJoinStaff: false,
      players: [player()],
      ownRegistrationDue: false,
    });
    expect(result.next).toMatchObject({ id: "coach", href: "/squadra#allenatore" });
  });

  it("mette l’iscrizione del referente prima dei buchi della rosa e non la conta due volte", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: false,
      staffPresent: true,
      canJoinStaff: false,
      players: [
        player({ isOwn: true, personalDataComplete: false, guardianState: "pending" }),
        player({ personalDataComplete: false }),
      ],
      ownRegistrationDue: true,
    });
    expect(result.items.find((item) => item.id === "personal")?.count).toBe(1);
    expect(result.items.find((item) => item.id === "guardian")?.count).toBe(0);
    expect(result.next?.id).toBe("own");
    const ownIndex = result.items.findIndex((item) => item.id === "own");
    const personalIndex = result.items.findIndex((item) => item.id === "personal");
    expect(ownIndex).toBeGreaterThan(-1);
    expect(ownIndex).toBeLessThan(personalIndex);
  });

  it("sul tutore distingue i rimbalzi dalle attese", () => {
    const result = projectSchoolChecklist({
      ...ready,
      coachMissing: false,
      staffPresent: true,
      canJoinStaff: false,
      players: [
        player({ guardianState: "pending", guardianEmailUndeliverable: true }),
        player({ guardianState: "pending" }),
      ],
      ownRegistrationDue: false,
    });
    expect(result.next).toMatchObject({
      id: "guardian",
      count: 2,
      undeliverableCount: 1,
      status: "attention",
    });
  });
});

describe("prossimo passo scuola", () => {
  it("salta la quota in attesa dell’organizzazione", () => {
    const result = projectSchoolChecklist({
      representativeEmailVerified: true,
      coachMissing: false,
      staffPresent: true,
      canJoinStaff: false,
      paymentMode: "TEAM",
      teamFee: { status: "missing" },
      teamPaymentSucceeded: false,
      players: [player({ personalDataComplete: false })],
      ownRegistrationDue: false,
    });
    expect(result.next?.id).toBe("personal");
    expect(
      nextSchoolStep({
        items: result.items,
        staffPresent: true,
        canJoinStaff: false,
      })?.id,
    ).toBe("personal");
  });
});
