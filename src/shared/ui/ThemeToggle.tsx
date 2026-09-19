"use client";

import { useLayoutEffect, useState } from "react";
import { it } from "@/shared/i18n/it";
import { Icon } from "./Icon";
import { applyTheme, parseTheme, readStoredTheme, type Theme } from "./theme";
import styles from "./ThemeToggle.module.css";

type Props = {
  showLabel?: boolean;
};

export function ThemeToggle({ showLabel = false }: Props) {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    applyTheme(stored);
    setTheme(stored);
  }, []);

  function toggle() {
    const next = parseTheme(document.documentElement.getAttribute("data-theme")) === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  const label = theme === "dark" ? it.themeToLight : it.themeToDark;

  return (
    <button type="button" className={styles.toggle} onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      {showLabel ? <span className={styles.label}>{label}</span> : null}
    </button>
  );
}
