import { describe, expect, it } from "vitest";
import {
  createEmailVerifyCode,
  decideUnverifiedEmailChange,
  emailCodeHashesMatch,
  emailVerificationPath,
  emailVerifyIdentifier,
  emailVerifyResendDelayMs,
  hashEmailVerifyCode,
  judgeEmailVerifyCode,
  maskEmailAddress,
  normalizeAccountEmail,
  normalizeEmailVerifyCode,
  pathAfterEmailVerification,
  safeInternalPath,
} from "./verify";

describe("codice di verifica email", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");

  it("nomina l’identifier per email, senza distinguere le maiuscole", () => {
    expect(emailVerifyIdentifier("Anna@Esempio.it")).toBe("email-verify:anna@esempio.it");
  });

  it("genera sei cifre, anche con zeri iniziali", () => {
    for (let index = 0; index < 30; index += 1) {
      expect(createEmailVerifyCode()).toMatch(/^\d{6}$/);
    }
  });

  it("accetta solo sei cifre e ignora spazi o trattini", () => {
    expect(normalizeEmailVerifyCode(" 482-913 ")).toBe("482913");
    expect(normalizeEmailVerifyCode("012345")).toBe("012345");
    expect(normalizeEmailVerifyCode("12345")).toBeNull();
    expect(normalizeEmailVerifyCode("1234567")).toBeNull();
    expect(normalizeEmailVerifyCode("12a456")).toBeNull();
  });

  it("confronta l’hash con pepper e in tempo costante", () => {
    const left = hashEmailVerifyCode("482913", "pepper-a");
    const right = hashEmailVerifyCode("482913", "pepper-a");
    expect(emailCodeHashesMatch(left, right)).toBe(true);
    expect(emailCodeHashesMatch(left, hashEmailVerifyCode("482914", "pepper-a"))).toBe(false);
    expect(emailCodeHashesMatch(left, hashEmailVerifyCode("482913", "pepper-b"))).toBe(false);
    expect(emailCodeHashesMatch("zz", right)).toBe(false);
  });

  it("distingue codice assente, scaduto, errato, bloccato e valido", () => {
    const live = { expiresAt: new Date("2026-10-07T18:00:00.000Z"), attempts: 0 };
    expect(judgeEmailVerifyCode({ record: null, matches: true, now })).toBe("invalid");
    expect(judgeEmailVerifyCode({ record: { ...live, expiresAt: now }, matches: true, now })).toBe("expired");
    expect(judgeEmailVerifyCode({ record: live, matches: false, now })).toBe("mismatch");
    expect(judgeEmailVerifyCode({ record: { ...live, attempts: 4 }, matches: false, now })).toBe("locked");
    expect(judgeEmailVerifyCode({ record: { ...live, attempts: 4 }, matches: true, now })).toBe("ok");
    expect(judgeEmailVerifyCode({ record: { ...live, attempts: 5 }, matches: true, now })).toBe("locked");
  });

  it("calcola il cooldown del reinvio", () => {
    const createdAt = new Date("2026-10-07T12:00:00.000Z");
    expect(emailVerifyResendDelayMs(createdAt, new Date("2026-10-07T12:00:20.000Z"), 60)).toBe(40_000);
    expect(emailVerifyResendDelayMs(createdAt, new Date("2026-10-07T12:02:00.000Z"), 60)).toBe(0);
  });

  it("maschera l’indirizzo e tiene i percorsi interni", () => {
    expect(maskEmailAddress("Anna@Esempio.it")).toBe("a•••@esempio.it");
    expect(safeInternalPath("/squadra")).toBe("/squadra");
    expect(safeInternalPath("https://evil.test")).toBe("/area");
    expect(safeInternalPath("//evil.test")).toBe("/area");
    expect(emailVerificationPath("/squadra")).toBe("/verifica-email?next=%2Fsquadra");
    expect(emailVerificationPath("/verifica-email?next=%2Farea")).toBe("/verifica-email?next=%2Farea");
    expect(pathAfterEmailVerification("/squadra")).toBe("/squadra");
    expect(pathAfterEmailVerification("/verifica-email?next=%2Farea")).toBe("/area");
    expect(pathAfterEmailVerification(null)).toBe("/area");
  });

  it("consente il cambio email solo se l’account non è ancora verificato", () => {
    expect(normalizeAccountEmail(" Mario.M8la@Gmail.com ")).toBe("mario.m8la@gmail.com");
    expect(
      decideUnverifiedEmailChange({
        currentEmail: "mario.m8la@gmal.com",
        nextEmail: "mario.m8la@gmail.com",
        verified: false,
      }),
    ).toBe("ok");
    expect(
      decideUnverifiedEmailChange({
        currentEmail: "mario.m8la@gmail.com",
        nextEmail: "Mario.M8la@gmail.com",
        verified: false,
      }),
    ).toBe("noop");
    expect(
      decideUnverifiedEmailChange({
        currentEmail: "mario.m8la@gmal.com",
        nextEmail: "mario.m8la@gmail.com",
        verified: true,
      }),
    ).toBe("verified");
    expect(
      decideUnverifiedEmailChange({
        currentEmail: "mario.m8la@gmal.com",
        nextEmail: "",
        verified: false,
      }),
    ).toBe("invalid");
  });
});
