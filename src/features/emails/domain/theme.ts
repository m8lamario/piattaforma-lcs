/**
 * Inline HEX for HTML email. Email clients ignore CSS custom properties, so this
 * file mirrors `src/shared/ui/tokens.css` (nav + light-theme content). Keep in sync.
 */
export const EMAIL_THEME = {
  headerBg: "#011674",
  headerFg: "#f4f7fb",
  headerMuted: "#c5cdd8",
  gradientNavy: "#011674",
  gradientBlue: "#012bfd",
  gradientTeal: "#00edaf",
  canvas: "#f4f6fa",
  card: "#ffffff",
  text: "#0f172a",
  textMuted: "#3d4f66",
  border: "#d5deea",
  hairline: "#e4ebf3",
  primary: "#012bfd",
  onPrimary: "#f8fbff",
  accent: "#00edaf",
  infoBox: "#e8edff",
  success: "#067647",
  warning: "#9a6700",
  danger: "#b42318",
  link: "#012bfd",
  footerBg: "#0e1016",
  footerFg: "#9aa3b0",
  footerLink: "#c5cdd8",
  radius: "6px",
  font: "Helvetica, Arial, sans-serif",
} as const;

export type EmailTone = "neutral" | "success" | "warning" | "danger";

export function emailToneColor(tone: EmailTone) {
  if (tone === "success") return EMAIL_THEME.success;
  if (tone === "warning") return EMAIL_THEME.warning;
  if (tone === "danger") return EMAIL_THEME.danger;
  return EMAIL_THEME.accent;
}

export const EMAIL_LOGO_PATH = "/logoLCSw.png";
export const EMAIL_WIDTH = 600;
