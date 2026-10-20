import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shouldShowCookieBanner } from "./consent";
import { clearTeamCookieOptions, shouldUseSecureCookie, teamCookieOptions } from "./options";
import {
  ADOBE_FONTS_ORIGINS,
  ADOBE_FONTS_STYLESHEET,
  BROWSER_COOKIE_HELP,
  FIRST_PARTY_COOKIES,
  OPTIONAL_TECHNOLOGIES,
  SESSION_MAX_AGE_SECONDS,
  STRIPE_COOKIE_POLICY_URL,
  VERCEL_INSIGHTS_PATH,
  VERCEL_PRIVACY_POLICY_URL,
  VERCEL_SCRIPTS_ORIGIN,
  VERCEL_SPEED_INSIGHTS_PATH,
  optionalCategories,
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
  it("dichiara Vercel Analytics e Speed Insights come statistica opzionale", () => {
    expect(OPTIONAL_TECHNOLOGIES.map((item) => item.id)).toEqual([
      "vercel-analytics",
      "vercel-speed-insights",
    ]);
    expect(optionalTechnologies()).toHaveLength(2);
    expect(optionalCategories()).toEqual(["analytics"]);
    expect(FIRST_PARTY_COOKIES.every((item) => item.category === "necessary")).toBe(true);
    expect(FIRST_PARTY_COOKIES.map((item) => item.id)).toContain("consent");
    expect(shouldShowCookieBanner(OPTIONAL_TECHNOLOGIES.length, null)).toBe(true);
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
    const insights = readFileSync(path.join(process.cwd(), "src/features/cookies/ui/VercelInsights.tsx"), "utf8");
    expect(auth).toContain("maxAge: SESSION_MAX_AGE_SECONDS");
    expect(layout).toContain("ADOBE_FONTS_STYLESHEET");
    expect(layout).toContain("VercelInsights");
    expect(proxy).toContain("connect-src 'self'");
    expect(proxy).toContain("frame-src 'none'");
    expect(proxy).toContain("RETIRED_COOKIE_NAMES");
    expect(proxy).toContain("VERCEL_SCRIPTS_ORIGIN");
    const runtime = readFileSync(
      path.join(process.cwd(), "src/features/cookies/ui/VercelInsightsRuntime.tsx"),
      "utf8",
    );
    expect(insights).toContain("mayLoadCategory");
    expect(insights).toContain("VercelInsightsRuntime");
    expect(runtime).toContain("@vercel/analytics/next");
    expect(runtime).toContain("@vercel/speed-insights/next");
    for (const item of FIRST_PARTY_COOKIES) {
      expect(policy).toContain(item.productionName);
    }
    expect(policy).toContain(ADOBE_FONTS_STYLESHEET);
    expect(policy).toContain(STRIPE_COOKIE_POLICY_URL);
    expect(policy).toContain(VERCEL_PRIVACY_POLICY_URL);
    expect(policy).toContain(VERCEL_INSIGHTS_PATH);
    expect(policy).toContain(VERCEL_SPEED_INSIGHTS_PATH);
    expect(policy).toContain(VERCEL_SCRIPTS_ORIGIN.replace("https://", ""));
    for (const item of OPTIONAL_TECHNOLOGIES) {
      expect(policy).toContain(item.name);
    }
    for (const link of BROWSER_COOKIE_HELP) {
      expect(policy).toContain(link.href);
    }
    for (const origin of ADOBE_FONTS_ORIGINS) {
      expect(policy).toContain(origin.replace("https://", ""));
    }
  });

  it("non carica tracker nel codice applicativo né nelle dipendenze, oltre a Vercel gated", () => {
    const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf8").toLowerCase();
    const sources = sourceFiles(path.join(process.cwd(), "src"));
    const joined = sources
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
      .toLowerCase();
    expect(packageJson).toContain("@vercel/analytics");
    expect(packageJson).toContain("@vercel/speed-insights");
    for (const marker of TRACKER_MARKERS) {
      expect(packageJson).not.toContain(marker);
      expect(joined).not.toContain(marker);
    }
    for (const file of sources) {
      const src = readFileSync(file, "utf8").toLowerCase();
      const relative = file.replace(/\\/g, "/");
      const sessionStores = [
        "features/consents/ui/privacyDraft.ts",
        "features/teams/ui/representativeFlow.ts",
      ];
      if (sessionStores.some((allowed) => relative.endsWith(allowed))) {
        expect(src).toContain("sessionstorage");
        continue;
      }
      expect(src, relative).not.toContain("sessionstorage");
      if (relative.includes("features/cookies/ui/VercelInsights")) continue;
      expect(src, relative).not.toContain("@vercel/analytics");
      expect(src, relative).not.toContain("@vercel/speed-insights");
    }
    expect(joined).not.toContain("document.cookie");
    expect(joined).not.toContain("window.localstorage");
  });
});
