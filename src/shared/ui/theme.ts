export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "eph-theme";

export function parseTheme(value: string | null | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(THEME_COOKIE, theme);
  } catch {
    /* private mode */
  }
}

export function readStoredTheme(): Theme {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    if (match?.[1]) return parseTheme(decodeURIComponent(match[1]));
    return parseTheme(localStorage.getItem(THEME_COOKIE));
  } catch {
    return DEFAULT_THEME;
  }
}

/** Runs in <head> before paint so the chosen theme does not flash. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_COOKIE)};var t;var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));if(m)t=decodeURIComponent(m[1]);if(t!=="light"&&t!=="dark")t=localStorage.getItem(k);if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})()`;
