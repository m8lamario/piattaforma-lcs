import { describe, expect, it } from "vitest";
import {
  STAFF_SLOT_LIMIT,
  coachSelectionBlocker,
  countStaffSlots,
  decideRepresentativeJoin,
  staffAdmission,
  teamCoachCompleteness,
  type StaffRegistrationRef,
} from "./staff";

const playerRegistration = (overrides: Partial<StaffRegistrationRef> = {}): StaffRegistrationRef => ({
  id: "reg-player",
  userId: "user-1",
  teamId: "team-1",
  editionId: "edition-1",
  category: "PLAYER",
  status: "IN_PROGRESS",
  ...overrides,
});

const staffRegistration = (overrides: Partial<StaffRegistrationRef> = {}): StaffRegistrationRef => ({
  id: "reg-staff",
  userId: "user-1",
  teamId: "team-1",
  editionId: "edition-1",
  category: "STAFF",
  status: "ACCOUNT_CREATED",
  ...overrides,
});

describe("limite staff", () => {
  it("conta solo le iscrizioni staff ancora in squadra", () => {
    expect(countStaffSlots(["APPROVED", "WITHDRAWN", "REMOVED", "IN_PROGRESS"])).toBe(2);
    expect(STAFF_SLOT_LIMIT).toBe(5);
  });

  it("rifiuta il sesto posto", () => {
    expect(staffAdmission(4).ok).toBe(true);
    expect(staffAdmission(5)).toEqual({ ok: false, reason: "staff_limit" });
  });

  it("due ammissioni simultanee non superano il limite", async () => {
    let occupied = 4;
    let chain: Promise<unknown> = Promise.resolve();
    const admit = () => {
      const run = chain.then(() => {
        const decision = staffAdmission(occupied);
        if (decision.ok) occupied = decision.occupied;
        return decision;
      });
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    };

    const [first, second] = await Promise.all([admit(), admit()]);
    const accepted = [first, second].filter((result) => result.ok);
    expect(accepted).toHaveLength(1);
    expect(occupied).toBe(5);
    expect(staffAdmission(occupied).ok).toBe(false);
  });
});

describe("ruolo aggiuntivo del referente", () => {
  const base = {
    userId: "rep-1",
    teamId: "team-1",
    editionId: "edition-1",
    occupiedStaff: 1,
  };

  it("crea un’iscrizione giocatore o staff sullo stesso account", () => {
    expect(decideRepresentativeJoin({ ...base, category: "PLAYER", registration: null })).toEqual({
      ok: true,
      action: "create",
    });
    expect(decideRepresentativeJoin({ ...base, category: "STAFF", registration: null })).toEqual({
      ok: true,
      action: "create",
    });
  });

  it("riusa l’iscrizione già attiva della stessa categoria", () => {
    expect(
      decideRepresentativeJoin({
        ...base,
        category: "STAFF",
        registration: staffRegistration({ userId: "rep-1", id: "reg-rep" }),
      }),
    ).toEqual({ ok: true, action: "already", registrationId: "reg-rep" });
    expect(
      decideRepresentativeJoin({
        ...base,
        category: "PLAYER",
        registration: playerRegistration({ userId: "rep-1", id: "reg-player" }),
      }),
    ).toEqual({ ok: true, action: "already", registrationId: "reg-player" });
  });

  it("impedisce di essere giocatore e staff insieme", () => {
    expect(
      decideRepresentativeJoin({
        ...base,
        occupiedStaff: 0,
        category: "STAFF",
        registration: playerRegistration({ userId: "rep-1" }),
      }),
    ).toEqual({ ok: false, reason: "category_conflict" });
    expect(
      decideRepresentativeJoin({
        ...base,
        occupiedStaff: 0,
        category: "PLAYER",
        registration: staffRegistration({ userId: "rep-1" }),
      }),
    ).toEqual({ ok: false, reason: "category_conflict" });
  });

  it("riapre dopo ritiro e non conta lo slot staff per il giocatore", () => {
    expect(
      decideRepresentativeJoin({
        ...base,
        occupiedStaff: 5,
        category: "PLAYER",
        registration: playerRegistration({ userId: "rep-1", status: "WITHDRAWN" }),
      }),
    ).toEqual({ ok: true, action: "reopen", registrationId: "reg-player" });
    expect(
      decideRepresentativeJoin({
        ...base,
        occupiedStaff: 5,
        category: "STAFF",
        registration: null,
      }),
    ).toEqual({ ok: false, reason: "staff_limit" });
  });

  it("non assegna un’iscrizione di un altro utente", () => {
    expect(
      decideRepresentativeJoin({
        ...base,
        occupiedStaff: 0,
        category: "STAFF",
        registration: staffRegistration({ userId: "other" }),
      }),
    ).toEqual({ ok: false, reason: "identity_conflict" });
  });
});

describe("allenatore", () => {
  const staff = {
    id: "reg-staff",
    teamId: "team-1",
    category: "STAFF" as const,
    status: "APPROVED",
  };

  it("accetta solo staff attivo della stessa squadra", () => {
    expect(coachSelectionBlocker({ teamId: "team-1", registration: staff })).toBeNull();
    expect(
      coachSelectionBlocker({
        teamId: "team-1",
        registration: { ...staff, category: "PLAYER" },
      }),
    ).toBe("not_staff");
    expect(
      coachSelectionBlocker({
        teamId: "team-1",
        registration: { ...staff, teamId: "team-2" },
      }),
    ).toBe("wrong_team");
    expect(coachSelectionBlocker({ teamId: "team-1", registration: null })).toBe("missing");
  });

  it("dopo la rimozione dell’allenatore la squadra torna incompleta", () => {
    expect(
      teamCoachCompleteness({
        teamId: "team-1",
        coachRegistrationId: staff.id,
        coach: staff,
      }).complete,
    ).toBe(true);

    const removed = teamCoachCompleteness({
      teamId: "team-1",
      coachRegistrationId: null,
      coach: null,
    });
    expect(removed).toEqual({ complete: false, reason: "missing" });

    const ineligible = teamCoachCompleteness({
      teamId: "team-1",
      coachRegistrationId: staff.id,
      coach: { ...staff, status: "REMOVED" },
    });
    expect(ineligible.complete).toBe(false);
    expect(ineligible.reason).toBe("ineligible");
  });
});
