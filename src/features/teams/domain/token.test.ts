import { describe, expect, it } from "vitest";
import { createInviteToken, extractInviteToken, hashInviteToken, isWellFormedInviteToken } from "./token";

describe("invite token", () => {
  it("genera un token opaco e lo memorizza solo come hash", () => {
    const token = createInviteToken();
    const digest = hashInviteToken(token);
    expect(isWellFormedInviteToken(token)).toBe(true);
    expect(digest).not.toBe(token);
    expect(digest).toHaveLength(64);
    expect(hashInviteToken(token)).toBe(digest);
    expect(hashInviteToken(`${token}x`)).not.toBe(digest);
  });

  it("rifiuta token manipolati o troppo corti", () => {
    expect(isWellFormedInviteToken("abc")).toBe(false);
    expect(isWellFormedInviteToken("../etc/passwd")).toBe(false);
    expect(isWellFormedInviteToken("a".repeat(43) + "!")).toBe(false);
  });

  it("estrae il token da URL o dal valore grezzo", () => {
    const token = createInviteToken();
    expect(extractInviteToken(`https://esempio.it/invito/${token}`)).toBe(token);
    expect(extractInviteToken(`/invito/${token}`)).toBe(token);
    expect(extractInviteToken(`https://esempio.it/iscrizione/${token}`)).toBe(token);
    expect(extractInviteToken(`  ${token}  `)).toBe(token);
    expect(extractInviteToken("/invito/../etc/passwd")).toBeNull();
    expect(extractInviteToken("not-a-token")).toBeNull();
  });
});
