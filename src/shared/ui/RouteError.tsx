"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { Button } from "@/shared/ui/Button";
import { userMessage } from "@/shared/errors";
import styles from "./RouteError.module.css";

type Props = {
  onRetry: () => void;
  homeHref?: string;
};

export function RouteError({ onRetry, homeHref = "/area" }: Props) {
  return (
    <section className={styles.card} role="alert">
      <h1>{it.errorRecoverTitle}</h1>
      <p>{userMessage("SYSTEM_UNEXPECTED")}</p>
      <p>{it.errorHintRetrySafe}</p>
      <p>
        {it.errorRefLabel}: <code>SYSTEM_UNEXPECTED</code>
      </p>
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
