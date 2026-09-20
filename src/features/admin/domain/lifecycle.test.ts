import { describe, expect, it } from "vitest";
import {
  ANONYMIZE_CONFIRM_WORD,
  DELETE_CONFIRM_WORD,
  LIFECYCLE_CODES,
  applyAnonymizeToGraph,
  applyDeleteToGraph,
  applyRemoveToGraph,
  assertRetainedOperationalTraces,
  decideAnonymizeAccount,
  decideDeleteAccount,
  decideRemoveFromTeam,
  type AccountInput,
  type LifecycleGraph,
  type RemoveInput,
} from "./lifecycle";

const playerMembership = {
  id: "mem-1",
  teamId: "team-1",
  userId: "player-1",
  role: "PLAYER" as const,
};

function removeInput(overrides: Partial<RemoveInput> = {}): RemoveInput {
  return {
    membership: playerMembership,
    lastName: "Rossi",
    confirm: "Rossi",
    registrationIds: ["reg-1"],
    pendingInviteIds: ["inv-1"],
    targetLifecycleStatus: "ACTIVE",
    ...overrides,
  };
}

function accountInput(overrides: Partial<AccountInput> = {}): AccountInput {
  return {
    user: { id: "player-1", lifecycleStatus: "ACTIVE", isSuperAdmin: false },
    actorUserId: "root-1",
    confirm: DELETE_CONFIRM_WORD,
    activeSuperAdminCount: 1,
    membershipIds: ["mem-1"],
    pendingInviteIds: ["inv-1"],
    pendingStaffInviteIds: [],
    representativeTeamIds: [],
    sessionIds: ["sess-1"],
    accountIds: ["acc-1"],
    notificationIds: ["n-1"],
    guardianIds: ["g-1"],
    documentIds: ["doc-1"],
    consentIds: ["c-1"],
    paymentIds: ["pay-1"],
    roleIds: ["role-1"],
    registrationIds: ["reg-1"],
    auditLogCount: 4,
    ...overrides,
  };
}

function graph(): LifecycleGraph {
  return {
    user: {
      id: "player-1",
      email: "anna@esempio.it",
      name: "Anna Rossi",
      passwordHash: "hash",
      lifecycleStatus: "ACTIVE",
    },
    fiscalCode: "RSSMRA80A01H501U",
    memberships: [{ id: "mem-1", teamId: "team-1", userId: "player-1", role: "PLAYER" }],
    registrations: [{ id: "reg-1", teamId: "team-1", status: "IN_PROGRESS" }],
    invites: [{ id: "inv-1", status: "PENDING" }],
    staffInvites: [],
    documents: [{ id: "doc-1", originalFilename: "certificato-anna.pdf", storageKey: "documents/reg-1/abc" }],
    consents: [{ id: "c-1", ipAddress: "1.1.1.1", userAgent: "Mozilla" }],
    payments: [{ id: "pay-1" }],
    notifications: [{ id: "n-1" }],
    auditLogs: [
      { id: "a-1", action: "INVITE_REDEEM" },
      { id: "a-2", action: "DOCUMENT_UPLOAD" },
    ],
    sessions: [{ id: "sess-1" }],
    accounts: [{ id: "acc-1" }],
    roles: [{ id: "role-1", role: "PLAYER" }],
    guardians: [{ id: "g-1", email: "genitore@esempio.it", firstName: "Mario", lastName: "Rossi", phone: "333" }],
    representativeTeamIds: [],
  };
}

describe("decideRemoveFromTeam", () => {
  it("rimuove membership e invita, senza cancellare l’account", () => {
    const decision = decideRemoveFromTeam(removeInput());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.deleteMembershipId).toBe("mem-1");
    expect(decision.plan.markRegistrationIds).toEqual(["reg-1"]);
    expect(decision.plan.retain.userRow).toBe("retain");
    expect(decision.plan.retain.profilePii).toBe("retain");
    expect(decision.plan.retain.medicalBlobs).toBe("retain");
  });

  it("rifiuta un rappresentante in rosa", () => {
    const decision = decideRemoveFromTeam(
      removeInput({ membership: { ...playerMembership, role: "REPRESENTATIVE" } }),
    );
    expect(decision).toEqual({ ok: false, code: LIFECYCLE_CODES.LIFECYCLE_REMOVE_NOT_PLAYER });
  });

  it("rifiuta membership assente (anche IDOR verso altra squadra)", () => {
    expect(decideRemoveFromTeam(removeInput({ membership: null }))).toEqual({
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_NOT_ON_TEAM,
    });
  });

  it("esige il cognome in conferma", () => {
    expect(decideRemoveFromTeam(removeInput({ confirm: "Bianchi" }))).toEqual({
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH,
    });
  });
});

describe("decideDeleteAccount", () => {
  it("chiude l’account senza cancellare audit, pagamenti, documenti", () => {
    const decision = decideDeleteAccount(accountInput());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.retain.auditLogs).toBe("retain");
    expect(decision.plan.retain.payments).toBe("retain");
    expect(decision.plan.retain.documents).toBe("retain");
    expect(decision.plan.retain.medicalBlobs).toBe("retain");
    expect(decision.plan.retain.profilePii).toBe("retain");
    expect(decision.plan.tombstoneEmail).toContain("player-1");
  });

  it("impedisce l’auto-cancellazione e l’ultimo Super Admin", () => {
    expect(decideDeleteAccount(accountInput({ actorUserId: "player-1" }))).toEqual({
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_CANNOT_DELETE_SELF,
    });
    expect(
      decideDeleteAccount(
        accountInput({
          user: { id: "root-2", lifecycleStatus: "ACTIVE", isSuperAdmin: true },
          activeSuperAdminCount: 1,
        }),
      ),
    ).toEqual({ ok: false, code: LIFECYCLE_CODES.LIFECYCLE_LAST_SUPER_ADMIN });
  });

  it("rifiuta conferma sbagliata e account già chiuso", () => {
    expect(decideDeleteAccount(accountInput({ confirm: "cancella" }))).toEqual({
      ok: false,
      code: LIFECYCLE_CODES.LIFECYCLE_CONFIRM_MISMATCH,
    });
    expect(
      decideDeleteAccount(
        accountInput({ user: { id: "player-1", lifecycleStatus: "DELETED", isSuperAdmin: false } }),
      ),
    ).toEqual({ ok: false, code: LIFECYCLE_CODES.LIFECYCLE_ALREADY_DELETED });
  });
});

describe("decideAnonymizeAccount", () => {
  it("anonimizza PII e tiene tracce operative", () => {
    const decision = decideAnonymizeAccount(accountInput({ confirm: ANONYMIZE_CONFIRM_WORD }));
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.plan.retain.profilePii).toBe("anonymize");
    expect(decision.plan.retain.consents).toBe("redact_trace");
    expect(decision.plan.retain.auditLogs).toBe("retain");
    expect(decision.plan.retain.medicalBlobs).toBe("retain");
    expect(decision.plan.retainPaymentIds).toEqual(["pay-1"]);
  });

  it("consente l’anonimizzazione di un account già chiuso", () => {
    const decision = decideAnonymizeAccount(
      accountInput({
        confirm: ANONYMIZE_CONFIRM_WORD,
        user: { id: "player-1", lifecycleStatus: "DELETED", isSuperAdmin: false },
      }),
    );
    expect(decision.ok).toBe(true);
  });
});

describe("risorse collegate dopo remove/delete/anonymize", () => {
  it("dopo remove: niente membership, account e audit restano", () => {
    const decision = decideRemoveFromTeam(removeInput());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const next = applyRemoveToGraph(graph(), decision.plan);
    expect(next.memberships).toHaveLength(0);
    expect(next.user.email).toBe("anna@esempio.it");
    expect(next.registrations[0]?.status).toBe("REMOVED");
    expect(next.invites[0]?.status).toBe("REVOKED");
    expect(next.documents[0]?.storageKey).toBe("documents/reg-1/abc");
    expect(next.auditLogs.some((row) => row.action === "PLAYER_REMOVE")).toBe(true);
  });

  it("dopo delete: login chiuso, niente orfani operativi, audit e file restano", () => {
    const decision = decideDeleteAccount(accountInput());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const next = applyDeleteToGraph(graph(), decision.plan);
    expect(next.user.lifecycleStatus).toBe("DELETED");
    expect(next.user.passwordHash).toBeNull();
    expect(next.memberships).toHaveLength(0);
    expect(next.sessions).toHaveLength(0);
    expect(next.roles).toHaveLength(0);
    expect(next.registrations).toHaveLength(1);
    expect(next.registrations[0]?.status).toBe("REMOVED");
    expect(next.fiscalCode).toBe("RSSMRA80A01H501U");
    expect(next.payments).toHaveLength(1);
    expect(next.documents[0]?.storageKey).toBeTruthy();
    expect(next.consents).toHaveLength(1);
    const retained = assertRetainedOperationalTraces(next);
    expect(retained.auditRemains).toBe(true);
    expect(retained.userRowRemains).toBe(true);
    expect(next.auditLogs.some((row) => row.action === "ACCOUNT_DELETE")).toBe(true);
  });

  it("dopo anonymize: PII tolta, storage key e pagamenti restano, audit non si cancella", () => {
    const decision = decideAnonymizeAccount(accountInput({ confirm: ANONYMIZE_CONFIRM_WORD }));
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const next = applyAnonymizeToGraph(graph(), decision.plan);
    expect(next.user.email).toMatch(/^anon\./);
    expect(next.user.name).toBeNull();
    expect(next.guardians[0]?.email).toMatch(/invalid\.local$/);
    expect(next.guardians[0]?.firstName).toBe("Anonimo");
    expect(next.documents[0]?.originalFilename).toBe("redatto");
    expect(next.documents[0]?.storageKey).toBe("documents/reg-1/abc");
    expect(next.consents[0]?.ipAddress).toBeNull();
    expect(next.fiscalCode).toBeNull();
    expect(next.registrations[0]?.status).toBe("REMOVED");
    expect(next.payments).toHaveLength(1);
    expect(next.auditLogs.some((row) => row.action === "ACCOUNT_ANONYMIZE")).toBe(true);
    expect(next.auditLogs.some((row) => row.action === "DOCUMENT_UPLOAD")).toBe(true);
  });
});
