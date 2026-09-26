export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(value: string | null | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

/** Runs in <head> before paint so prefers-color-scheme applies without a flash. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var root=document.documentElement;function apply(isLight){root.setAttribute("data-theme",isLight?"light":"dark");}var mq=window.matchMedia("(prefers-color-scheme: light)");apply(mq.matches);if(mq.addEventListener){mq.addEventListener("change",function(e){apply(e.matches);});}else if(mq.addListener){mq.addListener(function(e){apply(e.matches);});}}catch(e){}})()`;
