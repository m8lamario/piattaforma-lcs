import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/shared/errors";
import { fiscalCodeControlChar } from "./fiscalCode";
import {
  classifyFiscalIdentity,
  classifyRegistrationLifecycle,
  publicIdentityErrorCode,
  shouldPersistIdentityBlock,
  workspaceIdentityBlock,
  writeIdentityConflict,
  type IdentityHolder,
} from "./identity";

function validCf() {
  const body = "RSSMRA80A01H501";
  return `${body}${fiscalCodeControlChar(body)}`;
}

const current = {
  currentUserId: "user-b",
  currentTeamId: "team-1",
  currentEditionId: "edition-1",
  currentRegistrationStatus: "ACCOUNT_CREATED",
};

describe("classifyRegistrationLifecycle", () => {
  it("distingue completed / in_progress / withdrawn / blocked", () => {
    expect(classifyRegistrationLifecycle("APPROVED")).toBe("completed");
    expect(classifyRegistrationLifecycle("IN_PROGRESS")).toBe("in_progress");
    expect(classifyRegistrationLifecycle("WITHDRAWN")).toBe("withdrawn");
    expect(classifyRegistrationLifecycle("REMOVED")).toBe("removed");
    expect(classifyRegistrationLifecycle("INVITED")).toBe("invited");
    expect(classifyRegistrationLifecycle("IN_PROGRESS", true)).toBe("blocked");
    expect(classifyRegistrationLifecycle(null)).toBe("none");
  });
});

describe("classifyFiscalIdentity", () => {
  it("classifica un giocatore nuovo se il CF è libero", () => {
    expect(classifyFiscalIdentity({ ...current, holder: null })).toEqual({ kind: "new_player" });
  });

  it("riconosce il proprio profilo (già registrato / in corso)", () => {
    const holder: IdentityHolder = {
      userId: "user-b",
      registrations: [{ teamId: "team-1", editionId: "edition-1", status: "IN_PROGRESS" }],
    };
    expect(classifyFiscalIdentity({ ...current, holder })).toEqual({
      kind: "own_identity",
      lifecycle: "in_progress",
    });
  });

  it("stesso CF, email diversa: duplicate account senza PII", () => {
    const holder: IdentityHolder = {
      userId: "user-a",
      registrations: [{ teamId: "team-9", editionId: "edition-9", status: "WITHDRAWN" }],
    };
    const result = classifyFiscalIdentity({ ...current, holder });
    expect(result.kind).toBe("foreign_identity");
    if (result.kind !== "foreign_identity") return;
    expect(result.primary).toBe(ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT);
    expect(result.codes).toContain(ERROR_CODES.IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL);
    expect(result.codes).toContain(ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED);
    expect(result.needsUserAction).toBe(true);
    expect(result.needsOrgAction).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/@/);
    expect(publicIdentityErrorCode()).toBe(ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED);
  });

  it("doppia iscrizione sulla stessa edizione", () => {
    const holder: IdentityHolder = {
      userId: "user-a",
      registrations: [{ teamId: "team-2", editionId: "edition-1", status: "IN_PROGRESS" }],
    };
    const result = classifyFiscalIdentity({ ...current, holder });
    expect(result.kind).toBe("foreign_identity");
    if (result.kind !== "foreign_identity") return;
    expect(result.primary).toBe(ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION);
    expect(result.needsOrgAction).toBe(true);
    expect(result.codes).toContain(ERROR_CODES.IDENTITY_CONFLICT_NEEDS_ORG);
  });

  it("giocatore già in squadra (altro account)", () => {
    const holder: IdentityHolder = {
      userId: "user-a",
      registrations: [{ teamId: "team-1", editionId: "edition-1", status: "APPROVED" }],
    };
    const result = classifyFiscalIdentity({ ...current, holder });
    expect(result.kind).toBe("foreign_identity");
    if (result.kind !== "foreign_identity") return;
    expect(result.primary).toBe(ERROR_CODES.IDENTITY_PLAYER_ALREADY_ON_TEAM);
    expect(result.codes).toContain(ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION);
  });

  it("non blocca il workspace se il profilo ha già un CF proprio", () => {
    const foreign = classifyFiscalIdentity({
      ...current,
      holder: { userId: "user-a", registrations: [] },
    });
    expect(shouldPersistIdentityBlock({ classification: foreign, currentFiscalCode: validCf() })).toBe(false);
    expect(shouldPersistIdentityBlock({ classification: foreign, currentFiscalCode: null })).toBe(true);
  });

  it("il blocco in area sparisce se in seguito c’è un CF salvato", () => {
    const metadata = writeIdentityConflict(null, {
      code: ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
      detectedAt: "2026-09-20T00:00:00.000Z",
    });
    expect(workspaceIdentityBlock({ fiscalCode: null, metadata })?.code).toBe(ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT);
    expect(workspaceIdentityBlock({ fiscalCode: validCf(), metadata })).toBeNull();
  });

  it("CF su account chiuso o anonimizzato: serve l’organizzazione, non l’account originale", () => {
    const deleted = classifyFiscalIdentity({
      ...current,
      holder: {
        userId: "user-a",
        lifecycleStatus: "DELETED",
        registrations: [{ teamId: "team-1", editionId: "edition-1", status: "REMOVED" }],
      },
    });
    expect(deleted.kind).toBe("foreign_identity");
    if (deleted.kind !== "foreign_identity") return;
    expect(deleted.needsOrgAction).toBe(true);
    expect(deleted.codes).toContain(ERROR_CODES.IDENTITY_CONFLICT_NEEDS_ORG);
    expect(deleted.primary).toBe(ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT);

    const anonymized = classifyFiscalIdentity({
      ...current,
      holder: { userId: "user-a", lifecycleStatus: "ANONYMIZED", registrations: [] },
    });
    expect(anonymized.kind).toBe("foreign_identity");
    if (anonymized.kind !== "foreign_identity") return;
    expect(anonymized.needsOrgAction).toBe(true);
  });

  it("titolare ACTIVE con iscrizione REMOVED: CF occupato, account originale ancora usabile", () => {
    const result = classifyFiscalIdentity({
      ...current,
      holder: {
        userId: "user-a",
        lifecycleStatus: "ACTIVE",
        registrations: [{ teamId: "team-1", editionId: "edition-1", status: "REMOVED" }],
      },
    });
    expect(result.kind).toBe("foreign_identity");
    if (result.kind !== "foreign_identity") return;
    expect(result.needsOrgAction).toBe(false);
    expect(result.codes).toContain(ERROR_CODES.IDENTITY_CONFLICT_NEEDS_USER);
    expect(result.codes).not.toContain(ERROR_CODES.IDENTITY_PLAYER_ALREADY_ON_TEAM);
  });

  it("dopo ritiro o rimozione il pannello identità non resta attaccato", () => {
    const metadata = writeIdentityConflict(null, {
      code: ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
      detectedAt: "2026-09-20T00:00:00.000Z",
    });
    expect(workspaceIdentityBlock({ fiscalCode: null, metadata, registrationStatus: "WITHDRAWN" })).toBeNull();
    expect(workspaceIdentityBlock({ fiscalCode: null, metadata, registrationStatus: "REMOVED" })).toBeNull();
  });
});
