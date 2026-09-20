import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { it as copy } from "@/shared/i18n/it";
import {
  ERROR_CATALOG,
  ERROR_CODE_LIST,
  ERROR_CODES,
  codesInCategory,
  errorI18nKey,
  type ErrorCategory,
  type ErrorCode,
} from "@/shared/errors";

const CATEGORIES: ErrorCategory[] = [
  "AUTH",
  "AUTHZ",
  "IDENTITY",
  "REGISTRATION",
  "INVITES",
  "DOCUMENTS",
  "CONSENTS",
  "PAYMENTS",
  "TEAMS",
  "SYSTEM",
  "VALIDATION",
  "LIFECYCLE",
];

describe("error catalog", () => {
  it("ha una voce di catalogo per ogni codice", () => {
    expect(Object.keys(ERROR_CATALOG).sort()).toEqual([...ERROR_CODE_LIST].sort());
    expect(Object.values(ERROR_CODES).sort()).toEqual([...ERROR_CODE_LIST].sort());
  });

  it("ha una chiave i18n error{CODICE} per ogni codice", () => {
    const missing = ERROR_CODE_LIST.filter((code) => {
      const value = copy[errorI18nKey(code) as keyof typeof copy];
      return typeof value !== "string" || value.length === 0;
    });
    expect(missing).toEqual([]);
  });

  it("non usa messaggi utente identici al testo tecnico (salvo identità anti-enumerazione)", () => {
    const identityPublic = new Set<ErrorCode>([
      ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED,
      ERROR_CODES.IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL,
      ERROR_CODES.IDENTITY_DUPLICATE_ACCOUNT,
      ERROR_CODES.IDENTITY_DUPLICATE_REGISTRATION,
      ERROR_CODES.IDENTITY_PLAYER_ALREADY_ON_TEAM,
    ]);
    for (const code of identityPublic) {
      expect(copy[errorI18nKey(code) as keyof typeof copy]).toBe(
        copy[errorI18nKey(ERROR_CODES.IDENTITY_FISCAL_CODE_ASSOCIATED) as keyof typeof copy],
      );
    }
    const leaks = ERROR_CODE_LIST.filter((code) => {
      if ((identityPublic as Set<string>).has(code)) return false;
      const user = copy[errorI18nKey(code) as keyof typeof copy];
      return user === ERROR_CATALOG[code].technical;
    });
    expect(leaks).toEqual([]);
  });

  it("documenta ogni codice nel file della categoria", () => {
    const missing: string[] = [];
    for (const category of CATEGORIES) {
      const file = path.join(process.cwd(), "docs", "errors", `${category}.md`);
      const body = readFileSync(file, "utf8");
      for (const code of codesInCategory(category)) {
        if (!body.includes(`| ${code} |`) && !body.includes(`| \`${code}\` |`)) {
          missing.push(`${category}:${code}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("include LIFECYCLE come categoria di prima classe nel README", () => {
    const readme = readFileSync(path.join(process.cwd(), "docs", "errors", "README.md"), "utf8");
    expect(readme).toMatch(/LIFECYCLE/);
    expect(readme).toMatch(/ERROR_CODES/);
    expect(codesInCategory("LIFECYCLE").length).toBeGreaterThan(0);
  });
});