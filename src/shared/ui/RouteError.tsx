"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { Button } from "@/shared/ui/Button";
import styles from "./RouteError.module.css";

type Props = {
  onRetry: () => void;
  homeHref?: string;
};

export function RouteError({ onRetry, homeHref = "/area" }: Props) {
  return (
    <section className={styles.card} role="alert">
      <h1>{it.errorRecoverTitle}</h1>
      <p>{it.errorRecoverBody}</p>
      <div className={styles.actions}>
        <Button type="button" onClick={onRetry}>
          {it.errorRecoverRetry}
        </Button>
        <Link href={homeHref} className={styles.link}>
          {homeHref === "/" ? it.backHome : it.errorRecoverHome}
        </Link>
      </div>
    </section>
  );
}

export function PublicRouteErrorFrame({ children }: { children: ReactNode }) {
  return <main className={styles.publicWrap}>{children}</main>;
}
