import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, parseTheme, THEME_BOOTSTRAP_SCRIPT } from "./theme";

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

  it("keeps the bootstrap script aligned with prefers-color-scheme", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("data-theme");
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain("eph-theme");
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain("localStorage");
  });
});
