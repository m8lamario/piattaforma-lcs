import Link from "next/link";
import { it } from "@/shared/i18n/it";
import styles from "./TeamRoster.module.css";

type Props = {
  current: "dashboard" | "invites";
};

export function TeamSubnav({ current }: Props) {
  return (
    <nav className={styles.subnav} aria-label={it.navTeam}>
      <Link href="/squadra" aria-current={current === "dashboard" ? "page" : undefined}>
        {it.rosterTitle}
      </Link>
      <Link href="/squadra/inviti" aria-current={current === "invites" ? "page" : undefined}>
        {it.invitesNav}
      </Link>
    </nav>
  );
}
