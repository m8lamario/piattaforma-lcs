import type { ReactNode } from "react";
import styles from "./Icon.module.css";

export type IconName =
  | "menu"
  | "close"
  | "back"
  | "sun"
  | "moon"
  | "area"
  | "team"
  | "documents"
  | "inbox"
  | "check"
  | "alert"
  | "user"
  | "users"
  | "medical"
  | "privacy"
  | "camera"
  | "payment"
  | "summary"
  | "invite";

const PATHS: Record<IconName, ReactNode> = {
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h12" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  back: (
    <>
      <path d="M14 6l-6 6 6 6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6.2 6.2l1.3 1.3M16.5 16.5l1.3 1.3M17.8 6.2l-1.3 1.3M7.5 16.5l-1.3 1.3" />
    </>
  ),
  moon: (
    <>
      <path d="M15 4.5A7.5 7.5 0 1 0 19.5 14 6.2 6.2 0 0 1 15 4.5Z" />
    </>
  ),
  area: (
    <>
      <rect x="4.5" y="5.5" width="15" height="13" rx="1.2" />
      <circle cx="9" cy="11" r="1.6" />
      <path d="M13 9.5h5M13 12.5h4M7 16.2c.6-1.2 1.7-1.8 3-1.8s2.4.6 3 1.8" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="9" r="2" />
      <circle cx="16" cy="10" r="1.7" />
      <path d="M4.5 17.5c.7-2.2 2.4-3.4 4.5-3.4s3.8 1.2 4.5 3.4M13.2 17.5c.5-1.5 1.6-2.4 3-2.4 1.5 0 2.6.8 3.1 2.4" />
    </>
  ),
  documents: (
    <>
      <path d="M7.5 4.5h7.2L18.5 8v11.5h-11V4.5Z" />
      <path d="M14.5 4.5V8h4" />
      <path d="M10 12h5M10 15.5h4" />
    </>
  ),
  inbox: (
    <>
      <path d="M4.5 13.5 7 7.5h10l2.5 6v5h-15v-5Z" />
      <path d="M4.5 13.5h4.2l.8 2h5l.8-2h4.2" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5 20.5 19H3.5L12 4.5Z" />
      <path d="M12 10v4.5M12 16.8v.7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="9" r="2.4" />
      <path d="M6.5 18.5c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
    </>
  ),
  users: (
    <>
      <circle cx="9.5" cy="9" r="2.2" />
      <path d="M4.5 18c.8-2.3 2.5-3.5 5-3.5 2.4 0 4.1 1.2 5 3.5" />
      <circle cx="16.2" cy="9.5" r="1.8" />
      <path d="M14 18c.5-1.4 1.6-2.2 3-2.2 1.3 0 2.4.7 3 2" />
    </>
  ),
  medical: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="1.2" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  privacy: (
    <>
      <path d="M7 4.5h7l3.5 3.5V19.5H7V4.5Z" />
      <path d="M14 4.5V8h3.5" />
      <path d="M9.5 12.5h5M9.5 15.5h3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4.5 8.5h3l1.5-2h6l1.5 2h3V18h-15V8.5Z" />
      <circle cx="12" cy="12.5" r="2.6" />
    </>
  ),
  payment: (
    <>
      <path d="M7 6.5h10.5v14L12.5 18 7 20.5v-14Z" />
      <path d="M9.5 10.5h5.5M9.5 13.5h4" />
    </>
  ),
  summary: (
    <>
      <path d="M6 7h12M6 12h12M6 17h8" />
    </>
  ),
  invite: (
    <>
      <circle cx="10" cy="9" r="2.2" />
      <path d="M5 18c.8-2.3 2.4-3.5 5-3.5 1.2 0 2.2.3 3.1.8M16 10v6M13 13h6" />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 20, className }: Props) {
  const classes = [styles.icon, className].filter(Boolean).join(" ");
  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
