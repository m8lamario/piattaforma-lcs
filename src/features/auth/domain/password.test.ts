import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifica un hash e non memorizza la password in chiaro", async () => {
    const password = "correct-horse-battery";
    const digest = await hashPassword(password);
    expect(digest).not.toContain(password);
    expect(await verifyPassword(password, digest)).toBe(true);
    expect(await verifyPassword("wrong-password", digest)).toBe(false);
  });
});
