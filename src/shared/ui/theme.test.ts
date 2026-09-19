import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, parseTheme, THEME_BOOTSTRAP_SCRIPT, THEME_COOKIE } from "./theme";

describe("parseTheme", () => {
  it("defaults to dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(parseTheme(undefined)).toBe("dark");
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("system")).toBe("dark");
  });

  it("accepts an explicit light choice", () => {
    expect(parseTheme("light")).toBe("light");
  });

  it("keeps the bootstrap script aligned with the cookie name", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_COOKIE);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("data-theme");
  });
});
