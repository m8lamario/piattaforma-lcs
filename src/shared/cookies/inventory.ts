/**
 * Inventario tecnico di cookie e risorse esterne del frontend.
 * Le durate Auth.js sono quelle di `@auth/core` `defaultCookies` + `session.maxAge`
 * fissato in `src/auth.ts`. Non è una qualificazione giuridica.
 */

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;
export const TEAM_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const CONSENT_COOKIE_NAME = "eph-cookie-consent";

/** Nomi nostri non più usati. Se il browser li ha ancora, la risposta li cancella. */
export const RETIRED_COOKIE_NAMES = ["eph-theme"] as const;

export const ADOBE_FONTS_STYLESHEET = "https://use.typekit.net/ajb7nmd.css";
export const ADOBE_FONTS_ORIGINS = ["https://use.typekit.net", "https://p.typekit.net"] as const;

export type CookieCategory = "necessary" | "analytics" | "marketing";

export type FirstPartyCookie = {
  id: string;
  name: string;
  productionName: string;
  provider: string;
  purpose: string;
  category: CookieCategory;
  durationSeconds: number | null;
  durationLabel: string;
  path: string;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure: "https-only";
  setWhen: string;
};

export const FIRST_PARTY_COOKIES: readonly FirstPartyCookie[] = [
  {
    id: "session",
    name: "authjs.session-token",
    productionName: "__Secure-authjs.session-token",
    provider: "Auth.js (prima parte)",
    purpose: "Mantenere l’accesso all’area personale",
    category: "necessary",
    durationSeconds: SESSION_MAX_AGE_SECONDS,
    durationLabel: "30 giorni",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: "https-only",
    setWhen: "Al login riuscito. Auth.js può riscriverlo quando esegue l’azione di sessione.",
  },
  {
    id: "csrf",
    name: "authjs.csrf-token",
    productionName: "__Host-authjs.csrf-token",
    provider: "Auth.js (prima parte)",
    purpose: "Proteggere il flusso di accesso da richieste fraudolente",
    category: "necessary",
    durationSeconds: null,
    durationLabel: "sessione del browser",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: "https-only",
    setWhen: "Durante il flusso di accesso Auth.js",
  },
  {
    id: "callback",
    name: "authjs.callback-url",
    productionName: "__Secure-authjs.callback-url",
    provider: "Auth.js (prima parte)",
    purpose: "Riportare la persona alla pagina richiesta dopo il login",
    category: "necessary",
    durationSeconds: null,
    durationLabel: "sessione del browser",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: "https-only",
    setWhen: "Durante il flusso di accesso Auth.js",
  },
  {
    id: "team",
    name: "eph-team",
    productionName: "eph-team",
    provider: "ESL Player Hub (prima parte)",
    purpose: "Ricordare la squadra selezionata dal rappresentante, tra quelle già autorizzate",
    category: "necessary",
    durationSeconds: TEAM_COOKIE_MAX_AGE_SECONDS,
    durationLabel: "365 giorni",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: "https-only",
    setWhen: "Solo dopo la selezione esplicita di una squadra. Cancellato all’uscita dall’account.",
  },
];

export type OptionalTechnology = {
  id: string;
  name: string;
  provider: string;
  category: Exclude<CookieCategory, "necessary">;
  purpose: string;
};

/** Vuoto di proposito: nessun analytics, marketing o profilazione è previsto. */
export const OPTIONAL_TECHNOLOGIES: readonly OptionalTechnology[] = [];

export function optionalTechnologies() {
  return OPTIONAL_TECHNOLOGIES;
}

export function optionalCategories(): Array<OptionalTechnology["category"]> {
  return [...new Set(OPTIONAL_TECHNOLOGIES.map((item) => item.category))];
}

export const BROWSER_COOKIE_HELP = [
  {
    id: "chrome",
    label: "Google Chrome",
    href: "https://support.google.com/chrome/answer/95647",
  },
  {
    id: "firefox",
    label: "Mozilla Firefox",
    href: "https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox",
  },
  {
    id: "edge",
    label: "Microsoft Edge",
    href: "https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09",
  },
  {
    id: "safari",
    label: "Apple Safari",
    href: "https://support.apple.com/guide/safari/sfri11471/mac",
  },
] as const;

export const STRIPE_COOKIE_POLICY_URL = "https://stripe.com/it/legal/cookies-policy";
export const STRIPE_PRIVACY_POLICY_URL = "https://stripe.com/it/privacy";
export const ADOBE_FONTS_PRIVACY_URL = "https://www.adobe.com/privacy/policies/adobe-fonts.html";
