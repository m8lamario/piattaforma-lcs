import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clearTeamCookieOptions, shouldUseSecureCookie, teamCookieOptions } from "./options";
import {
  ADOBE_FONTS_ORIGINS,
  ADOBE_FONTS_STYLESHEET,
  BROWSER_COOKIE_HELP,
  FIRST_PARTY_COOKIES,
  OPTIONAL_TECHNOLOGIES,
  SESSION_MAX_AGE_SECONDS,
  STRIPE_COOKIE_POLICY_URL,
  optionalTechnologies,
} from "./inventory";

const TRACKER_MARKERS = [
  "googletagmanager",
  "google-analytics",
  "gtag(",
  "facebook.net",
  "connect.facebook",
  "hotjar",
  "mixpanel",
  "posthog",
  "segment.com",
  "plausible",
  "matomo",
  "sentry.io",
  "doubleclick",
  "@vercel/analytics",
  "@vercel/speed-insights",
];

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(ts|tsx|css|js|mjs)$/.test(entry) && !entry.endsWith(".test.ts")) files.push(full);
  }
  return files;
}

describe("inventario cookie", () => {
  it("non dichiara strumenti non necessari", () => {
    expect(OPTIONAL_TECHNOLOGIES).toEqual([]);
    expect(optionalTechnologies()).toHaveLength(0);
    expect(FIRST_PARTY_COOKIES.map((item) => item.category)).toEqual([
      "necessary",
      "necessary",
      "necessary",
      "necessary",
    ]);
  });

  it("fissa la sessione a 30 giorni e il cookie squadra a 365, con Secure solo su HTTPS", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(FIRST_PARTY_COOKIES.find((item) => item.id === "team")?.durationSeconds).toBe(365 * 24 * 60 * 60);
    expect(shouldUseSecureCookie("https")).toBe(true);
    expect(shouldUseSecureCookie("http")).toBe(false);
    expect(teamCookieOptions(true)).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    expect(clearTeamCookieOptions(true).maxAge).toBe(0);
  });

  it("allinea la pagina cookie, Auth.js e il layout ai nomi reali", () => {
    const policy = readFileSync(path.join(process.cwd(), "content/legal/cookie-policy.md"), "utf8");
    const auth = readFileSync(path.join(process.cwd(), "src/auth.ts"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    const proxy = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
    expect(auth).toContain("maxAge: SESSION_MAX_AGE_SECONDS");
    expect(layout).toContain("ADOBE_FONTS_STYLESHEET");
    expect(proxy).toContain("connect-src 'self'");
    expect(proxy).toContain("frame-src 'none'");
    expect(proxy).toContain("RETIRED_COOKIE_NAMES");
    for (const item of FIRST_PARTY_COOKIES) {
      expect(policy).toContain(item.productionName);
    }
    expect(policy).toContain(ADOBE_FONTS_STYLESHEET);
    expect(policy).toContain(STRIPE_COOKIE_POLICY_URL);
    for (const link of BROWSER_COOKIE_HELP) {
      expect(policy).toContain(link.href);
    }
    for (const origin of ADOBE_FONTS_ORIGINS) {
      expect(policy).toContain(origin.replace("https://", ""));
    }
  });

  it("non carica tracker nel codice applicativo né nelle dipendenze", () => {
    const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf8").toLowerCase();
    const sources = sourceFiles(path.join(process.cwd(), "src"));
    const joined = sources
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
      .toLowerCase();
    for (const marker of TRACKER_MARKERS) {
      expect(packageJson).not.toContain(marker);
      expect(joined).not.toContain(marker);
    }
    for (const file of sources) {
      const src = readFileSync(file, "utf8").toLowerCase();
      const relative = file.replace(/\\/g, "/");
      if (relative.endsWith("features/consents/ui/privacyDraft.ts")) {
        expect(src).toContain("sessionstorage");
        continue;
      }
      expect(src, relative).not.toContain("sessionstorage");
    }
    expect(joined).not.toContain("document.cookie");
    expect(joined).not.toContain("window.localstorage");
  });
});
