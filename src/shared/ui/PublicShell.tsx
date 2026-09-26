import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { BrandMark } from "./BrandMark";
import styles from "./PublicShell.module.css";

type Props = {
  children: ReactNode;
};

export function PublicShell({ children }: Props) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <BrandMark />
      </header>
      {children}
      <footer className={styles.footer}>
        <p className={styles.orgLine}>
          <Image src="/logoLCSw.png" alt="" width={28} height={37} className={styles.footerLogo} />
          {it.orgLine}
        </p>
        <nav aria-label={it.legalNav}>
          <Link href="/privacy">{it.privacy}</Link>
          <Link href="/liberatorie">{it.stepLiberatorie}</Link>
          <Link href="/termini">{it.terms}</Link>
          <Link href="/cookie">{it.cookies}</Link>
        </nav>
      </footer>
    </div>
  );
}
