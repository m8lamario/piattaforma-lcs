import { describe, expect, it } from "vitest";
import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD } from "@/features/admin/domain/lifecycle";
import {
  decideAnonymizeSchool,
  decideDeleteSchool,
  schoolDeleteBlockers,
  type SchoolLifecycleSnapshot,
  type SchoolUserRef,
} from "@/features/admin/domain/schoolLifecycle";

const user = (patch: Partial<SchoolUserRef> & Pick<SchoolUserRef, "id">): SchoolUserRef => ({
  lifecycleStatus: "ACTIVE",
  isActor: false,
  isLastSuperAdmin: false,
  platformRole: false,
  otherSchool: false,
  ...patch,
});

function snapshot(patch: Partial<SchoolLifecycleSnapshot> = {}): SchoolLifecycleSnapshot {
  return {
    school: { id: "school-1", name: "Liceo Roma", anonymized: false },
    confirm: ANONYMIZE_CONFIRM_WORD,
    actorUserId: "admin",
    users: [],
    teamIds: [],
    registrationIds: [],
    requestIds: [],
    playerCount: 0,
    staffCount: 0,
    representativeCount: 0,
    documentIds: [],
    paymentCount: 0,
    bankTransferCount: 0,
    ...patch,
  };
}

describe("ciclo di vita scuola", () => {
  it("consente la cancellazione di una scuola senza utenti né iscrizioni", () => {
    const decision = decideDeleteSchool(snapshot({ confirm: DELETE_CONFIRM_WORD }));
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.exclusiveUserIds).toEqual([]);
    expect(decision.plan.schoolId).toBe("school-1");
  });

  it("anonimizza i giocatori esclusivi e stacca chi è anche su un'altra scuola", () => {
    const decision = decideAnonymizeSchool(
      snapshot({
        users: [user({ id: "p1" }), user({ id: "p2" }), user({ id: "shared", otherSchool: true })],
        registrationIds: ["r1", "r2", "r3"],
        playerCount: 3,
      }),
    );
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.exclusiveUserIds).toEqual(["p1", "p2"]);
    expect(decision.plan.detachUserIds).toEqual(["shared"]);
  });

  it("blocca la cancellazione se ci sono certificati, pagamenti o bonifici", () => {
    expect(schoolDeleteBlockers(snapshot({ documentIds: ["d1"] }))).toEqual(["documents"]);
    expect(schoolDeleteBlockers(snapshot({ paymentCount: 1, bankTransferCount: 2 }))).toEqual([
      "payments",
      "bank_transfers",
    ]);
    const decision = decideDeleteSchool(
      snapshot({ confirm: DELETE_CONFIRM_WORD, paymentCount: 1, documentIds: ["d1"] }),
    );
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.code).toBe("SCHOOL_DELETE_BLOCKED");
  });

  it("rifiuta conferma errata, scuola assente, attore incluso e scuola già anonima", () => {
    expect(decideDeleteSchool(snapshot({ confirm: "no" })).ok).toBe(false);
    expect(decideAnonymizeSchool(snapshot({ school: null })).ok).toBe(false);
    expect(decideAnonymizeSchool(snapshot({ users: [user({ id: "admin", isActor: true })] })).ok).toBe(false);
    expect(
      decideAnonymizeSchool(snapshot({ school: { id: "school-1", name: "X", anonymized: true } })).ok,
    ).toBe(false);
  });

  it("non include nei piani gli account di un'altra scuola", () => {
    const decision = decideDeleteSchool(
      snapshot({
        confirm: DELETE_CONFIRM_WORD,
        users: [user({ id: "local" }), user({ id: "other", otherSchool: true })],
      }),
    );
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.exclusiveUserIds).toEqual(["local"]);
  });
});
